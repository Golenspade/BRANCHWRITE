use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Book {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub genre: String,
    pub cover_image: Option<String>,
    pub tags: Vec<String>,
    pub settings: Value,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSummary {
    pub id: String,
    pub book_id: String,
    pub title: String,
    pub sort_order: i64,
    pub document_type: String,
    pub status: String,
    pub word_count: i64,
    pub character_count: i64,
    pub revision: i64,
    pub version_sequence: i64,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDetail {
    pub id: String,
    pub book_id: String,
    pub title: String,
    pub sort_order: i64,
    pub document_type: String,
    pub status: String,
    pub word_count: i64,
    pub character_count: i64,
    pub revision: i64,
    pub version_sequence: i64,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub content: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionSummary {
    pub id: String,
    pub operation_id: String,
    pub document_id: String,
    pub sequence: i64,
    pub parent_version_id: Option<String>,
    pub restored_from_version_id: Option<String>,
    pub message: String,
    pub origin: String,
    pub content_hash: String,
    pub word_count: i64,
    pub character_count: i64,
    pub created_at_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionDetail {
    pub id: String,
    pub operation_id: String,
    pub document_id: String,
    pub sequence: i64,
    pub parent_version_id: Option<String>,
    pub restored_from_version_id: Option<String>,
    pub message: String,
    pub origin: String,
    pub content_hash: String,
    pub word_count: i64,
    pub character_count: i64,
    pub created_at_ms: i64,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PersistenceErrorCode {
    DatabaseBusy,
    Conflict,
    NotFound,
    Validation,
    MigrationFailed,
    StorageUnavailable,
    Internal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceError {
    pub code: PersistenceErrorCode,
    pub message: String,
    pub retryable: bool,
}

impl PersistenceError {
    pub fn new(code: PersistenceErrorCode, message: impl Into<String>, retryable: bool) -> Self {
        Self {
            code,
            message: message.into(),
            retryable,
        }
    }
}
