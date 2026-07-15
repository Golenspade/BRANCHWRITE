use crate::persistence::domain::{map_sqlite, not_found};
use crate::persistence::dto::{PersistenceError, VersionDetail, VersionSummary};
use rusqlite::{Connection, OptionalExtension, Row};

const SUMMARY_COLUMNS: &str = "id, operation_id, document_id, sequence, parent_version_id,
    restored_from_version_id, message, origin, content_hash, word_count, character_count,
    created_at_ms";
const DETAIL_COLUMNS: &str = "id, operation_id, document_id, sequence, parent_version_id,
    restored_from_version_id, message, origin, content_hash, word_count, character_count,
    created_at_ms, content";

pub fn list(
    connection: &Connection,
    document_id: &str,
) -> Result<Vec<VersionSummary>, PersistenceError> {
    require_document(connection, document_id)?;
    let mut statement = connection
        .prepare(&format!(
            "SELECT {SUMMARY_COLUMNS} FROM document_versions
             WHERE document_id = ?1 ORDER BY sequence DESC, id ASC"
        ))
        .map_err(map_sqlite)?;
    let versions = statement
        .query_map([document_id], summary_from_row)
        .map_err(map_sqlite)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite)?;
    Ok(versions)
}

pub fn get(
    connection: &Connection,
    document_id: &str,
    version_id: &str,
) -> Result<VersionDetail, PersistenceError> {
    connection
        .query_row(
            &format!(
                "SELECT {DETAIL_COLUMNS} FROM document_versions
                 WHERE document_id = ?1 AND id = ?2"
            ),
            [document_id, version_id],
            detail_from_row,
        )
        .optional()
        .map_err(map_sqlite)?
        .ok_or_else(not_found)
}

pub(super) fn by_operation(
    connection: &Connection,
    operation_id: &str,
) -> Result<Option<VersionDetail>, PersistenceError> {
    connection
        .query_row(
            &format!("SELECT {DETAIL_COLUMNS} FROM document_versions WHERE operation_id = ?1"),
            [operation_id],
            detail_from_row,
        )
        .optional()
        .map_err(map_sqlite)
}

pub(super) fn latest(
    connection: &Connection,
    document_id: &str,
) -> Result<Option<VersionSummary>, PersistenceError> {
    connection
        .query_row(
            &format!(
                "SELECT {SUMMARY_COLUMNS} FROM document_versions
                 WHERE document_id = ?1 ORDER BY sequence DESC, id ASC LIMIT 1"
            ),
            [document_id],
            summary_from_row,
        )
        .optional()
        .map_err(map_sqlite)
}

fn require_document(connection: &Connection, document_id: &str) -> Result<(), PersistenceError> {
    connection
        .query_row(
            "SELECT 1 FROM documents WHERE id = ?1",
            [document_id],
            |_| Ok(()),
        )
        .optional()
        .map_err(map_sqlite)?
        .ok_or_else(not_found)
}

fn summary_from_row(row: &Row<'_>) -> rusqlite::Result<VersionSummary> {
    Ok(VersionSummary {
        id: row.get(0)?,
        operation_id: row.get(1)?,
        document_id: row.get(2)?,
        sequence: row.get(3)?,
        parent_version_id: row.get(4)?,
        restored_from_version_id: row.get(5)?,
        message: row.get(6)?,
        origin: row.get(7)?,
        content_hash: row.get(8)?,
        word_count: row.get(9)?,
        character_count: row.get(10)?,
        created_at_ms: row.get(11)?,
    })
}

fn detail_from_row(row: &Row<'_>) -> rusqlite::Result<VersionDetail> {
    let summary = summary_from_row(row)?;
    Ok(VersionDetail {
        id: summary.id,
        operation_id: summary.operation_id,
        document_id: summary.document_id,
        sequence: summary.sequence,
        parent_version_id: summary.parent_version_id,
        restored_from_version_id: summary.restored_from_version_id,
        message: summary.message,
        origin: summary.origin,
        content_hash: summary.content_hash,
        word_count: summary.word_count,
        character_count: summary.character_count,
        created_at_ms: summary.created_at_ms,
        content: row.get(12)?,
    })
}
