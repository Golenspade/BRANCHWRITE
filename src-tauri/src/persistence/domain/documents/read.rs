use crate::persistence::domain::{map_sqlite, not_found};
use crate::persistence::dto::{DocumentDetail, DocumentSummary, PersistenceError};
use rusqlite::{Connection, OptionalExtension, Row};

const DETAIL_COLUMNS: &str = "id, book_id, title, sort_order, document_type, status,
    word_count, character_count, revision, version_sequence, created_at_ms, updated_at_ms,
    content, content_hash";
const SUMMARY_COLUMNS: &str = "id, book_id, title, sort_order, document_type, status,
    word_count, character_count, revision, version_sequence, created_at_ms, updated_at_ms";

pub fn list(
    connection: &Connection,
    book_id: &str,
) -> Result<Vec<DocumentSummary>, PersistenceError> {
    let mut statement = connection
        .prepare(&format!(
            "SELECT {SUMMARY_COLUMNS} FROM documents
             WHERE book_id = ?1 ORDER BY sort_order ASC, id ASC"
        ))
        .map_err(map_sqlite)?;
    let summaries = statement
        .query_map([book_id], summary_from_row)
        .map_err(map_sqlite)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite)?;
    Ok(summaries)
}

pub fn get(connection: &Connection, id: &str) -> Result<DocumentDetail, PersistenceError> {
    connection
        .query_row(
            &format!("SELECT {DETAIL_COLUMNS} FROM documents WHERE id = ?1"),
            [id],
            detail_from_row,
        )
        .optional()
        .map_err(map_sqlite)?
        .ok_or_else(not_found)
}

fn summary_from_row(row: &Row<'_>) -> rusqlite::Result<DocumentSummary> {
    Ok(DocumentSummary {
        id: row.get(0)?,
        book_id: row.get(1)?,
        title: row.get(2)?,
        sort_order: row.get(3)?,
        document_type: row.get(4)?,
        status: row.get(5)?,
        word_count: row.get(6)?,
        character_count: row.get(7)?,
        revision: row.get(8)?,
        version_sequence: row.get(9)?,
        created_at_ms: row.get(10)?,
        updated_at_ms: row.get(11)?,
    })
}

fn detail_from_row(row: &Row<'_>) -> rusqlite::Result<DocumentDetail> {
    Ok(DocumentDetail {
        id: row.get(0)?,
        book_id: row.get(1)?,
        title: row.get(2)?,
        sort_order: row.get(3)?,
        document_type: row.get(4)?,
        status: row.get(5)?,
        word_count: row.get(6)?,
        character_count: row.get(7)?,
        revision: row.get(8)?,
        version_sequence: row.get(9)?,
        created_at_ms: row.get(10)?,
        updated_at_ms: row.get(11)?,
        content: row.get(12)?,
        content_hash: row.get(13)?,
    })
}
