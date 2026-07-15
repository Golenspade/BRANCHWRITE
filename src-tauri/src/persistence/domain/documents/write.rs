use super::{read, validate_create, validate_update};
use crate::persistence::domain::{
    conflict, content_metadata, map_sqlite, next_timestamp, not_found, now_ms, validate_revision,
};
use crate::persistence::dto::{
    CreateDocumentInput, DocumentDetail, PersistenceError, SaveDocumentInput,
    UpdateDocumentMetadataInput,
};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use uuid::Uuid;

pub fn create(
    connection: &mut Connection,
    input: CreateDocumentInput,
) -> Result<DocumentDetail, PersistenceError> {
    validate_create(&input)?;
    let (content_hash, word_count, character_count) = content_metadata(&input.content);
    let timestamp = now_ms();
    let detail = DocumentDetail {
        id: Uuid::new_v4().to_string(),
        book_id: input.book_id,
        title: input.title,
        sort_order: input.sort_order,
        document_type: input.document_type,
        status: input.status,
        word_count,
        character_count,
        revision: 0,
        version_sequence: 0,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
        content: input.content,
        content_hash,
    };
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    let book_exists = transaction
        .query_row(
            "SELECT 1 FROM books WHERE id = ?1",
            [&detail.book_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(map_sqlite)?
        .is_some();
    if !book_exists {
        return Err(not_found());
    }
    transaction
        .execute(
            "INSERT INTO documents (id, book_id, title, sort_order, document_type, status,
             content, content_hash, word_count, character_count, revision, version_sequence,
             created_at_ms, updated_at_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 0, ?11, ?11)",
            params![
                detail.id,
                detail.book_id,
                detail.title,
                detail.sort_order,
                detail.document_type,
                detail.status,
                detail.content,
                detail.content_hash,
                detail.word_count,
                detail.character_count,
                timestamp
            ],
        )
        .map_err(map_sqlite)?;
    transaction.commit().map_err(map_sqlite)?;
    Ok(detail)
}

pub fn update_metadata(
    connection: &mut Connection,
    input: UpdateDocumentMetadataInput,
) -> Result<DocumentDetail, PersistenceError> {
    validate_update(&input)?;
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    let current = read::get(&transaction, &input.document_id)?;
    if current.revision != input.expected_revision {
        return Err(conflict());
    }
    let unchanged = current.title == input.title
        && current.sort_order == input.sort_order
        && current.document_type == input.document_type
        && current.status == input.status;
    if unchanged {
        transaction.commit().map_err(map_sqlite)?;
        return Ok(current);
    }
    let revision = current.revision + 1;
    let updated_at_ms = next_timestamp(current.updated_at_ms);
    transaction
        .execute(
            "UPDATE documents SET title=?2, sort_order=?3, document_type=?4, status=?5,
             revision=?6, updated_at_ms=?7 WHERE id=?1 AND revision=?8",
            params![
                input.document_id,
                input.title,
                input.sort_order,
                input.document_type,
                input.status,
                revision,
                updated_at_ms,
                input.expected_revision
            ],
        )
        .map_err(map_sqlite)?;
    transaction.commit().map_err(map_sqlite)?;
    Ok(DocumentDetail {
        title: input.title,
        sort_order: input.sort_order,
        document_type: input.document_type,
        status: input.status,
        revision,
        updated_at_ms,
        ..current
    })
}

pub fn save(
    connection: &mut Connection,
    input: SaveDocumentInput,
) -> Result<DocumentDetail, PersistenceError> {
    validate_revision(input.expected_revision)?;
    let (content_hash, word_count, character_count) = content_metadata(&input.content);
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    let current = read::get(&transaction, &input.document_id)?;
    if current.revision != input.expected_revision {
        return Err(conflict());
    }
    if current.content == input.content {
        transaction.commit().map_err(map_sqlite)?;
        return Ok(current);
    }
    let revision = current.revision + 1;
    let updated_at_ms = next_timestamp(current.updated_at_ms);
    transaction
        .execute(
            "UPDATE documents SET content=?2, content_hash=?3, word_count=?4,
             character_count=?5, revision=?6, updated_at_ms=?7
             WHERE id=?1 AND revision=?8",
            params![
                input.document_id,
                input.content,
                content_hash,
                word_count,
                character_count,
                revision,
                updated_at_ms,
                input.expected_revision
            ],
        )
        .map_err(map_sqlite)?;
    transaction.commit().map_err(map_sqlite)?;
    Ok(DocumentDetail {
        content: input.content,
        content_hash,
        word_count,
        character_count,
        revision,
        updated_at_ms,
        ..current
    })
}

pub fn delete(connection: &mut Connection, id: &str) -> Result<(), PersistenceError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    let changed = transaction
        .execute("DELETE FROM documents WHERE id = ?1", [id])
        .map_err(map_sqlite)?;
    if changed == 0 {
        return Err(not_found());
    }
    transaction.commit().map_err(map_sqlite)
}
