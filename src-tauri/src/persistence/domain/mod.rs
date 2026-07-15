pub mod books;
pub mod documents;

use super::dto::{PersistenceError, PersistenceErrorCode};
use rusqlite::ErrorCode;
use sha2::{Digest, Sha256};

const DATABASE_BUSY: &str = "database is busy";
const CONFLICT: &str = "revision conflict";
const INTERNAL: &str = "persistence operation failed";
const NOT_FOUND: &str = "record not found";
const VALIDATION: &str = "invalid persistence input";

pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

pub fn next_timestamp(previous: i64) -> i64 {
    now_ms().max(previous.saturating_add(1))
}

pub fn content_metadata(content: &str) -> (String, i64, i64) {
    let hash = format!("{:x}", Sha256::digest(content.as_bytes()));
    let word_count = content.split_whitespace().count() as i64;
    let character_count = content.chars().count() as i64;
    (hash, word_count, character_count)
}

pub fn map_sqlite(error: rusqlite::Error) -> PersistenceError {
    match error.sqlite_error_code() {
        Some(ErrorCode::DatabaseBusy) => {
            PersistenceError::new(PersistenceErrorCode::DatabaseBusy, DATABASE_BUSY, true)
        }
        Some(ErrorCode::ConstraintViolation) => validation(),
        _ => internal(),
    }
}

pub fn conflict() -> PersistenceError {
    PersistenceError::new(PersistenceErrorCode::Conflict, CONFLICT, false)
}

pub fn not_found() -> PersistenceError {
    PersistenceError::new(PersistenceErrorCode::NotFound, NOT_FOUND, false)
}

pub fn validation() -> PersistenceError {
    PersistenceError::new(PersistenceErrorCode::Validation, VALIDATION, false)
}

pub fn internal() -> PersistenceError {
    PersistenceError::new(PersistenceErrorCode::Internal, INTERNAL, false)
}

pub fn validate_text(value: &str) -> Result<(), PersistenceError> {
    if value.trim().is_empty() || value.contains('\0') {
        return Err(validation());
    }
    Ok(())
}

pub fn validate_revision(revision: i64) -> Result<(), PersistenceError> {
    if revision < 0 || revision == i64::MAX {
        return Err(validation());
    }
    Ok(())
}
