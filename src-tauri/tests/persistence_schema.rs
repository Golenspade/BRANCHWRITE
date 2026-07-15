use app_lib::persistence::dto::{Book, PersistenceError, PersistenceErrorCode};
use app_lib::persistence::migrations::{migrate, validate};
use rusqlite::{params, Connection};
use serde_json::json;
use tempfile::TempDir;

const HASH: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

fn database_path(temp: &TempDir) -> std::path::PathBuf {
    temp.path().join("branchwrite-v2.sqlite3")
}

fn open_migrated(temp: &TempDir) -> Connection {
    let mut connection = Connection::open(database_path(temp)).unwrap();
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .unwrap();
    migrate(&mut connection).unwrap();
    connection
}

fn insert_book_and_document(connection: &Connection, book_id: &str, document_id: &str) {
    connection
        .execute(
            "INSERT INTO books (id, name, created_at_ms, updated_at_ms) VALUES (?1, 'Book', 1, 1)",
            [book_id],
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO documents
             (id, book_id, title, document_type, content_hash, created_at_ms, updated_at_ms)
             VALUES (?1, ?2, 'Chapter', 'chapter', ?3, 1, 1)",
            params![document_id, book_id, HASH],
        )
        .unwrap();
}

#[test]
fn migration_validates_and_is_idempotent() {
    validate().expect("embedded migrations must validate");
    let temp = TempDir::new().unwrap();
    for _ in 0..2 {
        let connection = open_migrated(&temp);
        let version: i64 = connection
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .unwrap();
        assert_eq!(version, 1);
        for table in ["books", "documents", "document_versions"] {
            let count: i64 = connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = ?1",
                    [table],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "missing table {table}");
        }
    }
}

#[test]
fn schema_enforces_json_hash_origin_uniqueness_and_cascade() {
    let temp = TempDir::new().unwrap();
    let connection = open_migrated(&temp);
    assert!(connection
        .execute(
            "INSERT INTO books (id, name, tags_json, created_at_ms, updated_at_ms)
             VALUES ('bad-json', 'Book', '{}', 1, 1)",
            [],
        )
        .is_err());
    insert_book_and_document(&connection, "book", "doc");
    assert!(connection
        .execute(
            "INSERT INTO documents
             (id, book_id, title, document_type, content_hash, created_at_ms, updated_at_ms)
             VALUES ('bad-hash', 'book', 'Bad', 'chapter', 'ABC', 1, 1)",
            [],
        )
        .is_err());
    connection
        .execute(
            "INSERT INTO document_versions
             (id, operation_id, document_id, sequence, message, origin, content,
              content_hash, word_count, character_count, created_at_ms)
             VALUES ('v1', 'op-1', 'doc', 1, 'Save', 'manual', '', ?1, 0, 0, 2)",
            [HASH],
        )
        .unwrap();
    for statement in [
        "INSERT INTO document_versions (id, operation_id, document_id, sequence, message, origin, content, content_hash, word_count, character_count, created_at_ms) VALUES ('bad-origin', 'op-2', 'doc', 2, 'Save', 'auto', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 0, 0, 2)",
        "INSERT INTO document_versions (id, operation_id, document_id, sequence, message, origin, content, content_hash, word_count, character_count, created_at_ms) VALUES ('dup-sequence', 'op-3', 'doc', 1, 'Save', 'manual', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 0, 0, 2)",
        "INSERT INTO document_versions (id, operation_id, document_id, sequence, message, origin, content, content_hash, word_count, character_count, created_at_ms) VALUES ('dup-operation', 'op-1', 'doc', 2, 'Save', 'manual', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 0, 0, 2)",
    ] {
        assert!(connection.execute(statement, []).is_err());
    }
    connection
        .execute("DELETE FROM books WHERE id = 'book'", [])
        .unwrap();
    let documents: i64 = connection
        .query_row("SELECT count(*) FROM documents", [], |row| row.get(0))
        .unwrap();
    let versions: i64 = connection
        .query_row("SELECT count(*) FROM document_versions", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!((documents, versions), (0, 0));
}

#[test]
fn version_parent_must_belong_to_the_same_document() {
    let temp = TempDir::new().unwrap();
    let connection = open_migrated(&temp);
    insert_book_and_document(&connection, "book", "doc-a");
    connection
        .execute(
            "INSERT INTO documents (id, book_id, title, document_type, content_hash, created_at_ms, updated_at_ms) VALUES ('doc-b', 'book', 'Other', 'chapter', ?1, 1, 1)",
            [HASH],
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO document_versions (id, operation_id, document_id, sequence, message, origin, content, content_hash, word_count, character_count, created_at_ms) VALUES ('other-v1', 'other-op', 'doc-b', 1, 'Save', 'manual', '', ?1, 0, 0, 2)",
            [HASH],
        )
        .unwrap();
    let result = connection.execute_batch(&format!(
        "BEGIN; INSERT INTO document_versions (id, operation_id, document_id, sequence, parent_version_id, message, origin, content, content_hash, word_count, character_count, created_at_ms) VALUES ('bad-parent', 'bad-parent-op', 'doc-a', 1, 'other-v1', 'Save', 'manual', '', '{HASH}', 0, 0, 2); COMMIT;"
    ));
    assert!(result.is_err());
}

#[test]
fn a_failed_migration_rolls_back_every_statement_and_user_version() {
    let mut connection = Connection::open_in_memory().unwrap();
    connection
        .execute("CREATE TABLE documents (collision INTEGER)", [])
        .unwrap();
    assert!(migrate(&mut connection).is_err());
    let books: i64 = connection
        .query_row(
            "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = 'books'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let version: i64 = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap();
    assert_eq!((books, version), (0, 0));
}

#[test]
fn shared_values_serialize_with_camel_case_and_stable_error_codes() {
    let book = Book {
        id: "book".into(),
        name: "Book".into(),
        description: String::new(),
        author: String::new(),
        genre: "general".into(),
        cover_image: None,
        tags: vec!["fiction".into()],
        settings: json!({"theme": "dark"}),
        created_at_ms: 1,
        updated_at_ms: 2,
    };
    let value = serde_json::to_value(book).unwrap();
    assert_eq!(value["coverImage"], json!(null));
    assert_eq!(value["createdAtMs"], json!(1));
    assert!(value.get("created_at_ms").is_none());
    let error = PersistenceError::new(
        PersistenceErrorCode::MigrationFailed,
        "migration failed",
        false,
    );
    assert_eq!(
        serde_json::to_value(error).unwrap(),
        json!({"code": "migrationFailed", "message": "migration failed", "retryable": false})
    );
}
