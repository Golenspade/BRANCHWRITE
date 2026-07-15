use super::dto::{
    Book, CreateBookInput, CreateDocumentInput, DocumentDetail, DocumentSummary, PersistenceError,
    SaveDocumentInput, UpdateBookInput, UpdateDocumentMetadataInput,
};
use super::worker::PersistenceWorker;
use tauri::State;

#[tauri::command]
pub async fn list_books(
    state: State<'_, PersistenceWorker>,
) -> Result<Vec<Book>, PersistenceError> {
    state.list_books().await
}

#[tauri::command]
pub async fn get_book(
    state: State<'_, PersistenceWorker>,
    book_id: String,
) -> Result<Book, PersistenceError> {
    state.get_book(book_id).await
}

#[tauri::command]
pub async fn create_book(
    state: State<'_, PersistenceWorker>,
    input: CreateBookInput,
) -> Result<Book, PersistenceError> {
    state.create_book(input).await
}

#[tauri::command]
pub async fn update_book(
    state: State<'_, PersistenceWorker>,
    input: UpdateBookInput,
) -> Result<Book, PersistenceError> {
    state.update_book(input).await
}

#[tauri::command]
pub async fn delete_book(
    state: State<'_, PersistenceWorker>,
    book_id: String,
) -> Result<(), PersistenceError> {
    state.delete_book(book_id).await
}

#[tauri::command]
pub async fn list_documents(
    state: State<'_, PersistenceWorker>,
    book_id: String,
) -> Result<Vec<DocumentSummary>, PersistenceError> {
    state.list_documents(book_id).await
}

#[tauri::command]
pub async fn get_document(
    state: State<'_, PersistenceWorker>,
    document_id: String,
) -> Result<DocumentDetail, PersistenceError> {
    state.get_document(document_id).await
}

#[tauri::command]
pub async fn create_document(
    state: State<'_, PersistenceWorker>,
    input: CreateDocumentInput,
) -> Result<DocumentDetail, PersistenceError> {
    state.create_document(input).await
}

#[tauri::command]
pub async fn update_document_metadata(
    state: State<'_, PersistenceWorker>,
    input: UpdateDocumentMetadataInput,
) -> Result<DocumentDetail, PersistenceError> {
    state.update_document_metadata(input).await
}

#[tauri::command]
pub async fn save_document(
    state: State<'_, PersistenceWorker>,
    input: SaveDocumentInput,
) -> Result<DocumentDetail, PersistenceError> {
    state.save_document(input).await
}

#[tauri::command]
pub async fn delete_document(
    state: State<'_, PersistenceWorker>,
    document_id: String,
) -> Result<(), PersistenceError> {
    state.delete_document(document_id).await
}
