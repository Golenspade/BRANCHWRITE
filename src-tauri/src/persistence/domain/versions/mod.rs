mod create;
mod read;
mod restore;

pub use create::create;
pub use read::{get, list};
pub use restore::restore;

use crate::persistence::domain::{map_sqlite, validation};
use crate::persistence::dto::{PersistenceError, VersionDetail, VersionSummary};
use rusqlite::{params, Transaction};
use uuid::Uuid;

fn validate_operation_id(operation_id: &str) -> Result<(), PersistenceError> {
    Uuid::parse_str(operation_id)
        .map(|_| ())
        .map_err(|_| validation())
}

fn next_sequence(current: i64, increment: i64) -> Result<i64, PersistenceError> {
    current.checked_add(increment).ok_or_else(validation)
}

fn to_summary(detail: &VersionDetail) -> VersionSummary {
    VersionSummary {
        id: detail.id.clone(),
        operation_id: detail.operation_id.clone(),
        document_id: detail.document_id.clone(),
        sequence: detail.sequence,
        parent_version_id: detail.parent_version_id.clone(),
        restored_from_version_id: detail.restored_from_version_id.clone(),
        message: detail.message.clone(),
        origin: detail.origin.clone(),
        content_hash: detail.content_hash.clone(),
        word_count: detail.word_count,
        character_count: detail.character_count,
        created_at_ms: detail.created_at_ms,
    }
}

fn insert(transaction: &Transaction<'_>, version: &VersionDetail) -> Result<(), PersistenceError> {
    transaction
        .execute(
            "INSERT INTO document_versions
             (id, operation_id, document_id, sequence, parent_version_id,
              restored_from_version_id, message, origin, content, content_hash,
              word_count, character_count, created_at_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                version.id,
                version.operation_id,
                version.document_id,
                version.sequence,
                version.parent_version_id,
                version.restored_from_version_id,
                version.message,
                version.origin,
                version.content,
                version.content_hash,
                version.word_count,
                version.character_count,
                version.created_at_ms,
            ],
        )
        .map_err(map_sqlite)?;
    Ok(())
}
