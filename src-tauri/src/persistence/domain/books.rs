use super::{internal, map_sqlite, next_timestamp, not_found, now_ms, validate_text, validation};
use crate::persistence::dto::{Book, CreateBookInput, PersistenceError, UpdateBookInput};
use rusqlite::{params, Connection, OptionalExtension, Row, TransactionBehavior};
use serde_json::Value;
use uuid::Uuid;

const SELECT_BOOK: &str = "SELECT id, name, description, author, genre, cover_image,
    tags_json, settings_json, created_at_ms, updated_at_ms FROM books";

struct BookRecord {
    id: String,
    name: String,
    description: String,
    author: String,
    genre: String,
    cover_image: Option<String>,
    tags_json: String,
    settings_json: String,
    created_at_ms: i64,
    updated_at_ms: i64,
}

pub fn list(connection: &Connection) -> Result<Vec<Book>, PersistenceError> {
    let mut statement = connection
        .prepare(&format!(
            "{SELECT_BOOK} ORDER BY updated_at_ms DESC, id ASC"
        ))
        .map_err(map_sqlite)?;
    let records = statement
        .query_map([], record_from_row)
        .map_err(map_sqlite)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite)?;
    records.into_iter().map(decode).collect()
}

pub fn get(connection: &Connection, id: &str) -> Result<Book, PersistenceError> {
    let record = connection
        .query_row(
            &format!("{SELECT_BOOK} WHERE id = ?1"),
            [id],
            record_from_row,
        )
        .optional()
        .map_err(map_sqlite)?
        .ok_or_else(not_found)?;
    decode(record)
}

pub fn create(
    connection: &mut Connection,
    input: CreateBookInput,
) -> Result<Book, PersistenceError> {
    validate_input(&input.name, &input.tags, &input.settings)?;
    let tags_json = serde_json::to_string(&input.tags).map_err(|_| internal())?;
    let settings_json = serde_json::to_string(&input.settings).map_err(|_| internal())?;
    let timestamp = now_ms();
    let book = Book {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        description: input.description,
        author: input.author,
        genre: input.genre,
        cover_image: input.cover_image,
        tags: input.tags,
        settings: input.settings,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    transaction
        .execute(
            "INSERT INTO books (id, name, description, author, genre, cover_image,
             tags_json, settings_json, created_at_ms, updated_at_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
            params![
                book.id,
                book.name,
                book.description,
                book.author,
                book.genre,
                book.cover_image,
                tags_json,
                settings_json,
                timestamp
            ],
        )
        .map_err(map_sqlite)?;
    transaction.commit().map_err(map_sqlite)?;
    Ok(book)
}

pub fn update(
    connection: &mut Connection,
    input: UpdateBookInput,
) -> Result<Book, PersistenceError> {
    validate_input(&input.name, &input.tags, &input.settings)?;
    let tags_json = serde_json::to_string(&input.tags).map_err(|_| internal())?;
    let settings_json = serde_json::to_string(&input.settings).map_err(|_| internal())?;
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    let previous = get(&transaction, &input.id)?;
    let updated_at_ms = next_timestamp(previous.updated_at_ms);
    transaction
        .execute(
            "UPDATE books SET name=?2, description=?3, author=?4, genre=?5,
             cover_image=?6, tags_json=?7, settings_json=?8, updated_at_ms=?9 WHERE id=?1",
            params![
                input.id,
                input.name,
                input.description,
                input.author,
                input.genre,
                input.cover_image,
                tags_json,
                settings_json,
                updated_at_ms
            ],
        )
        .map_err(map_sqlite)?;
    transaction.commit().map_err(map_sqlite)?;
    Ok(Book {
        id: input.id,
        name: input.name,
        description: input.description,
        author: input.author,
        genre: input.genre,
        cover_image: input.cover_image,
        tags: input.tags,
        settings: input.settings,
        created_at_ms: previous.created_at_ms,
        updated_at_ms,
    })
}

pub fn delete(connection: &mut Connection, id: &str) -> Result<(), PersistenceError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite)?;
    let changed = transaction
        .execute("DELETE FROM books WHERE id = ?1", [id])
        .map_err(map_sqlite)?;
    if changed == 0 {
        return Err(not_found());
    }
    transaction.commit().map_err(map_sqlite)
}

fn validate_input(name: &str, tags: &[String], settings: &Value) -> Result<(), PersistenceError> {
    validate_text(name)?;
    if tags
        .iter()
        .any(|tag| tag.trim().is_empty() || tag.contains('\0'))
        || !settings.is_object()
    {
        return Err(validation());
    }
    Ok(())
}

fn record_from_row(row: &Row<'_>) -> rusqlite::Result<BookRecord> {
    Ok(BookRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        author: row.get(3)?,
        genre: row.get(4)?,
        cover_image: row.get(5)?,
        tags_json: row.get(6)?,
        settings_json: row.get(7)?,
        created_at_ms: row.get(8)?,
        updated_at_ms: row.get(9)?,
    })
}

fn decode(record: BookRecord) -> Result<Book, PersistenceError> {
    Ok(Book {
        id: record.id,
        name: record.name,
        description: record.description,
        author: record.author,
        genre: record.genre,
        cover_image: record.cover_image,
        tags: serde_json::from_str(&record.tags_json).map_err(|_| internal())?,
        settings: serde_json::from_str(&record.settings_json).map_err(|_| internal())?,
        created_at_ms: record.created_at_ms,
        updated_at_ms: record.updated_at_ms,
    })
}
