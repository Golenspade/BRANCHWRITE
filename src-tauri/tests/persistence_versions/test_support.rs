use crate::support::document_input;
use app_lib::persistence::dto::{CreateVersionInput, DocumentDetail};
use app_lib::persistence::worker::PersistenceWorker;

pub fn operation_id(value: u64) -> String {
    format!("00000000-0000-4000-8000-{value:012}")
}

pub async fn create_document(
    worker: &PersistenceWorker,
    book_id: &str,
    title: &str,
    content: &str,
) -> DocumentDetail {
    let mut input = document_input(book_id, title, 0);
    input.content = content.into();
    worker.create_document(input).await.unwrap()
}

pub fn create_version_input(
    operation: u64,
    document_id: &str,
    content: &str,
    message: &str,
    expected_revision: i64,
) -> CreateVersionInput {
    CreateVersionInput {
        operation_id: operation_id(operation),
        document_id: document_id.into(),
        content: content.into(),
        message: message.into(),
        expected_revision,
    }
}
