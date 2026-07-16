use super::dto::{
    Book, CreateBookInput, CreateDocumentInput, CreateVersionInput, DocumentDetail,
    DocumentSummary, PersistenceError, RestoreVersionInput, RestoreVersionResult,
    SaveDocumentInput, UpdateBookInput, UpdateDocumentMetadataInput, VersionDetail, VersionSummary,
};
use super::state::PersistenceState;
use tauri::State;

#[tauri::command]
pub async fn list_books(state: State<'_, PersistenceState>) -> Result<Vec<Book>, PersistenceError> {
    state.worker()?.list_books().await
}

#[tauri::command]
pub async fn get_book(
    state: State<'_, PersistenceState>,
    book_id: String,
) -> Result<Book, PersistenceError> {
    state.worker()?.get_book(book_id).await
}

#[tauri::command]
pub async fn create_book(
    state: State<'_, PersistenceState>,
    input: CreateBookInput,
) -> Result<Book, PersistenceError> {
    state.worker()?.create_book(input).await
}

#[tauri::command]
pub async fn update_book(
    state: State<'_, PersistenceState>,
    input: UpdateBookInput,
) -> Result<Book, PersistenceError> {
    state.worker()?.update_book(input).await
}

#[tauri::command]
pub async fn delete_book(
    state: State<'_, PersistenceState>,
    book_id: String,
) -> Result<(), PersistenceError> {
    state.worker()?.delete_book(book_id).await
}

#[tauri::command]
pub async fn list_documents(
    state: State<'_, PersistenceState>,
    book_id: String,
) -> Result<Vec<DocumentSummary>, PersistenceError> {
    state.worker()?.list_documents(book_id).await
}

#[tauri::command]
pub async fn get_document(
    state: State<'_, PersistenceState>,
    document_id: String,
) -> Result<DocumentDetail, PersistenceError> {
    state.worker()?.get_document(document_id).await
}

#[tauri::command]
pub async fn create_document(
    state: State<'_, PersistenceState>,
    input: CreateDocumentInput,
) -> Result<DocumentDetail, PersistenceError> {
    state.worker()?.create_document(input).await
}

#[tauri::command]
pub async fn update_document_metadata(
    state: State<'_, PersistenceState>,
    input: UpdateDocumentMetadataInput,
) -> Result<DocumentDetail, PersistenceError> {
    state.worker()?.update_document_metadata(input).await
}

#[tauri::command]
pub async fn save_document(
    state: State<'_, PersistenceState>,
    input: SaveDocumentInput,
) -> Result<DocumentDetail, PersistenceError> {
    state.worker()?.save_document(input).await
}

#[tauri::command]
pub async fn delete_document(
    state: State<'_, PersistenceState>,
    document_id: String,
) -> Result<(), PersistenceError> {
    state.worker()?.delete_document(document_id).await
}

#[tauri::command]
pub async fn list_versions(
    state: State<'_, PersistenceState>,
    document_id: String,
) -> Result<Vec<VersionSummary>, PersistenceError> {
    state.worker()?.list_versions(document_id).await
}

#[tauri::command]
pub async fn get_version(
    state: State<'_, PersistenceState>,
    document_id: String,
    version_id: String,
) -> Result<VersionDetail, PersistenceError> {
    state.worker()?.get_version(document_id, version_id).await
}

#[tauri::command]
pub async fn create_version(
    state: State<'_, PersistenceState>,
    input: CreateVersionInput,
) -> Result<VersionDetail, PersistenceError> {
    state.worker()?.create_version(input).await
}

#[tauri::command]
pub async fn restore_version(
    state: State<'_, PersistenceState>,
    input: RestoreVersionInput,
) -> Result<RestoreVersionResult, PersistenceError> {
    state.worker()?.restore_version(input).await
}
