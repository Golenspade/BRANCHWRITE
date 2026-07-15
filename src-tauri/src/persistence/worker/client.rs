use super::{worker_unavailable, PersistenceWorker, Request};
use crate::persistence::dto::{
    Book, CreateBookInput, CreateDocumentInput, DocumentDetail, DocumentSummary, PersistenceError,
    SaveDocumentInput, UpdateBookInput, UpdateDocumentMetadataInput,
};
use tokio::sync::oneshot;

impl PersistenceWorker {
    pub async fn list_books(&self) -> Result<Vec<Book>, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::ListBooks { respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn get_book(&self, id: String) -> Result<Book, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::GetBook { id, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn create_book(&self, input: CreateBookInput) -> Result<Book, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::CreateBook { input, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn update_book(&self, input: UpdateBookInput) -> Result<Book, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::UpdateBook { input, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn delete_book(&self, id: String) -> Result<(), PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::DeleteBook { id, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn list_documents(
        &self,
        book_id: String,
    ) -> Result<Vec<DocumentSummary>, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::ListDocuments {
                book_id,
                respond_to,
            })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn get_document(&self, id: String) -> Result<DocumentDetail, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::GetDocument { id, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn create_document(
        &self,
        input: CreateDocumentInput,
    ) -> Result<DocumentDetail, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::CreateDocument { input, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn update_document_metadata(
        &self,
        input: UpdateDocumentMetadataInput,
    ) -> Result<DocumentDetail, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::UpdateDocumentMetadata { input, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn save_document(
        &self,
        input: SaveDocumentInput,
    ) -> Result<DocumentDetail, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::SaveDocument { input, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn delete_document(&self, id: String) -> Result<(), PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::DeleteDocument { id, respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }
}
