use super::{insert, next_sequence, read, to_summary, validate_operation_id};
use crate::persistence::domain::documents;
use crate::persistence::domain::{
    conflict, map_sqlite, next_timestamp, validate_revision, validation,
};
use crate::persistence::dto::{
    PersistenceError, RestoreVersionInput, RestoreVersionResult, VersionDetail,
};
use rusqlite::{params, Connection, TransactionBehavior};
use uuid::Uuid;

pub fn restore(
    connection: &mut Connection,
    input: RestoreVersionInput,
) -> Result<RestoreVersionResult, PersistenceError> {
    validate_operation_id(&input.operation_id)?;
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;

    if let Some(existing) = read::by_operation(&transaction, &input.operation_id)? {
        let matches = existing.origin == "restore"
            && existing.document_id == input.document_id
            && existing.restored_from_version_id.as_deref() == Some(&input.target_version_id);
        if !matches {
            return Err(conflict());
        }
        let safety_id = existing
            .parent_version_id
            .as_deref()
            .ok_or_else(validation)?;
        let safety = read::get(&transaction, &input.document_id, safety_id)?;
        let result = completed_result(&safety, &existing);
        transaction.commit().map_err(map_sqlite)?;
        return Ok(result);
    }

    let current = documents::get(&transaction, &input.document_id)?;
    validate_revision(input.expected_revision)?;
    if current.revision != input.expected_revision {
        return Err(conflict());
    }
    let target = read::get(&transaction, &input.document_id, &input.target_version_id)?;
    if target.content == current.content {
        transaction.commit().map_err(map_sqlite)?;
        return Ok(RestoreVersionResult {
            already_current: true,
            safety_version: None,
            restored_version: None,
        });
    }

    let safety_sequence = next_sequence(current.version_sequence, 1)?;
    let restore_sequence = next_sequence(current.version_sequence, 2)?;
    let timestamp = next_timestamp(current.updated_at_ms);
    let safety = VersionDetail {
        id: Uuid::new_v4().to_string(),
        operation_id: Uuid::new_v4().to_string(),
        document_id: input.document_id.clone(),
        sequence: safety_sequence,
        parent_version_id: read::latest(&transaction, &input.document_id)?.map(|item| item.id),
        restored_from_version_id: None,
        message: "Restore safety snapshot".into(),
        origin: "restoreSafety".into(),
        content_hash: current.content_hash,
        word_count: current.word_count,
        character_count: current.character_count,
        created_at_ms: timestamp,
        content: current.content,
    };
    let restored = VersionDetail {
        id: Uuid::new_v4().to_string(),
        operation_id: input.operation_id,
        document_id: input.document_id,
        sequence: restore_sequence,
        parent_version_id: Some(safety.id.clone()),
        restored_from_version_id: Some(target.id.clone()),
        message: format!("Restored: {}", target.message),
        origin: "restore".into(),
        content_hash: target.content_hash,
        word_count: target.word_count,
        character_count: target.character_count,
        created_at_ms: timestamp,
        content: target.content,
    };

    insert(&transaction, &safety)?;
    insert(&transaction, &restored)?;
    let changed = transaction
        .execute(
            "UPDATE documents SET content=?2, content_hash=?3, word_count=?4,
             character_count=?5, revision=?6, version_sequence=?7, updated_at_ms=?8
             WHERE id=?1 AND revision=?9",
            params![
                restored.document_id,
                restored.content,
                restored.content_hash,
                restored.word_count,
                restored.character_count,
                current.revision + 1,
                restored.sequence,
                timestamp,
                current.revision,
            ],
        )
        .map_err(map_sqlite)?;
    if changed != 1 {
        return Err(conflict());
    }
    transaction.commit().map_err(map_sqlite)?;
    Ok(completed_result(&safety, &restored))
}

fn completed_result(safety: &VersionDetail, restored: &VersionDetail) -> RestoreVersionResult {
    RestoreVersionResult {
        already_current: false,
        safety_version: Some(to_summary(safety)),
        restored_version: Some(to_summary(restored)),
    }
}
