mod read;
mod write;

pub use read::{get, list};
pub use write::{create, delete, save, update_metadata};

use crate::persistence::domain::{validate_revision, validate_text, validation};
use crate::persistence::dto::{CreateDocumentInput, PersistenceError, UpdateDocumentMetadataInput};

fn validate_create(input: &CreateDocumentInput) -> Result<(), PersistenceError> {
    validate_metadata(
        &input.title,
        input.sort_order,
        &input.document_type,
        &input.status,
    )
}

fn validate_update(input: &UpdateDocumentMetadataInput) -> Result<(), PersistenceError> {
    validate_revision(input.expected_revision)?;
    validate_metadata(
        &input.title,
        input.sort_order,
        &input.document_type,
        &input.status,
    )
}

fn validate_metadata(
    title: &str,
    sort_order: i64,
    document_type: &str,
    status: &str,
) -> Result<(), PersistenceError> {
    validate_text(title)?;
    let valid_type = matches!(document_type, "chapter" | "section" | "note");
    let valid_status = matches!(status, "draft" | "review" | "final");
    if sort_order < 0 || !valid_type || !valid_status {
        return Err(validation());
    }
    Ok(())
}
