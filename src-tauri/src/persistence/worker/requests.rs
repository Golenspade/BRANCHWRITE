use super::Health;
use crate::persistence::dto::{
    Book, CreateBookInput, CreateDocumentInput, DocumentDetail, DocumentSummary, PersistenceError,
    SaveDocumentInput, UpdateBookInput, UpdateDocumentMetadataInput,
};
use tokio::sync::oneshot;

pub enum Request {
    Health {
        respond_to: oneshot::Sender<Result<Health, PersistenceError>>,
    },
    ListBooks {
        respond_to: oneshot::Sender<Result<Vec<Book>, PersistenceError>>,
    },
    GetBook {
        id: String,
        respond_to: oneshot::Sender<Result<Book, PersistenceError>>,
    },
    CreateBook {
        input: CreateBookInput,
        respond_to: oneshot::Sender<Result<Book, PersistenceError>>,
    },
    UpdateBook {
        input: UpdateBookInput,
        respond_to: oneshot::Sender<Result<Book, PersistenceError>>,
    },
    DeleteBook {
        id: String,
        respond_to: oneshot::Sender<Result<(), PersistenceError>>,
    },
    ListDocuments {
        book_id: String,
        respond_to: oneshot::Sender<Result<Vec<DocumentSummary>, PersistenceError>>,
    },
    GetDocument {
        id: String,
        respond_to: oneshot::Sender<Result<DocumentDetail, PersistenceError>>,
    },
    CreateDocument {
        input: CreateDocumentInput,
        respond_to: oneshot::Sender<Result<DocumentDetail, PersistenceError>>,
    },
    UpdateDocumentMetadata {
        input: UpdateDocumentMetadataInput,
        respond_to: oneshot::Sender<Result<DocumentDetail, PersistenceError>>,
    },
    SaveDocument {
        input: SaveDocumentInput,
        respond_to: oneshot::Sender<Result<DocumentDetail, PersistenceError>>,
    },
    DeleteDocument {
        id: String,
        respond_to: oneshot::Sender<Result<(), PersistenceError>>,
    },
    Shutdown {
        respond_to: oneshot::Sender<Result<(), PersistenceError>>,
    },
}
