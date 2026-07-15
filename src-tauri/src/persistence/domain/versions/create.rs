use super::{insert, next_sequence, read, validate_operation_id};
use crate::persistence::domain::documents;
use crate::persistence::domain::{
    conflict, content_metadata, map_sqlite, next_timestamp, validate_revision, validate_text,
};
use crate::persistence::dto::{CreateVersionInput, PersistenceError, VersionDetail};
use rusqlite::{params, Connection, TransactionBehavior};
use uuid::Uuid;

pub fn create(
    connection: &mut Connection,
    input: CreateVersionInput,
) -> Result<VersionDetail, PersistenceError> {
    validate_operation_id(&input.operation_id)?;
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;

    if let Some(existing) = read::by_operation(&transaction, &input.operation_id)? {
        let matches = existing.origin == "manual"
            && existing.document_id == input.document_id
            && existing.content == input.content
            && existing.message == input.message;
        if !matches {
            return Err(conflict());
        }
        transaction.commit().map_err(map_sqlite)?;
        return Ok(existing);
    }

    validate_text(&input.message)?;
    let current = documents::get(&transaction, &input.document_id)?;
    validate_revision(input.expected_revision)?;
    if current.revision != input.expected_revision {
        return Err(conflict());
    }
    let sequence = next_sequence(current.version_sequence, 1)?;
    let parent_version_id = read::latest(&transaction, &input.document_id)?.map(|item| item.id);
    let timestamp = next_timestamp(current.updated_at_ms);
    let (content_hash, word_count, character_count) = content_metadata(&input.content);
    let version = VersionDetail {
        id: Uuid::new_v4().to_string(),
        operation_id: input.operation_id,
        document_id: input.document_id,
        sequence,
        parent_version_id,
        restored_from_version_id: None,
        message: input.message,
        origin: "manual".into(),
        content_hash: content_hash.clone(),
        word_count,
        character_count,
        created_at_ms: timestamp,
        content: input.content,
    };

    let changed = transaction
        .execute(
            "UPDATE documents SET content=?2, content_hash=?3, word_count=?4,
             character_count=?5, revision=?6, version_sequence=?7, updated_at_ms=?8
             WHERE id=?1 AND revision=?9",
            params![
                version.document_id,
                version.content,
                version.content_hash,
                version.word_count,
                version.character_count,
                current.revision + 1,
                version.sequence,
                timestamp,
                current.revision,
            ],
        )
        .map_err(map_sqlite)?;
    if changed != 1 {
        return Err(conflict());
    }
    insert(&transaction, &version)?;
    transaction.commit().map_err(map_sqlite)?;
    Ok(version)
}
