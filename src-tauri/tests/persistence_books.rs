mod support;

use app_lib::persistence::dto::{PersistenceErrorCode, UpdateBookInput};
use app_lib::persistence::worker::PersistenceWorker;
use serde_json::json;
use support::{book_input, document_input};
use tempfile::TempDir;

#[tokio::test]
async fn book_crud_replacement_ordering_and_reopen_are_persistent() {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let first = worker.create_book(book_input("First")).await.unwrap();
    let second = worker.create_book(book_input("Second")).await.unwrap();

    assert_ne!(first.id, second.id);
    assert!(first.created_at_ms >= 0);
    assert_eq!(first.created_at_ms, first.updated_at_ms);
    assert_eq!(worker.get_book(first.id.clone()).await.unwrap(), first);

    let updated = worker
        .update_book(UpdateBookInput {
            id: first.id.clone(),
            name: "Renamed".into(),
            description: String::new(),
            author: "New Author".into(),
            genre: "memoir".into(),
            cover_image: None,
            tags: vec!["published".into()],
            settings: json!({"theme": "light"}),
        })
        .await
        .unwrap();
    assert_eq!(updated.name, "Renamed");
    assert_eq!(updated.description, "");
    assert_eq!(updated.cover_image, None);
    assert_eq!(updated.tags, vec!["published"]);
    assert_eq!(updated.settings, json!({"theme": "light"}));
    assert!(updated.updated_at_ms > first.updated_at_ms);

    let books = worker.list_books().await.unwrap();
    assert_eq!(books.len(), 2);
    assert!(books.windows(2).all(|pair| {
        pair[0].updated_at_ms > pair[1].updated_at_ms
            || (pair[0].updated_at_ms == pair[1].updated_at_ms && pair[0].id < pair[1].id)
    }));
    worker.shutdown().await.unwrap();

    let worker = PersistenceWorker::start(temp.path()).unwrap();
    assert_eq!(worker.get_book(updated.id.clone()).await.unwrap(), updated);
    worker.delete_book(second.id.clone()).await.unwrap();
    let error = worker.get_book(second.id).await.unwrap_err();
    assert_eq!(error.code, PersistenceErrorCode::NotFound);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn deleting_a_book_permanently_cascades_documents() {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let book = worker.create_book(book_input("Cascade")).await.unwrap();
    let document = worker
        .create_document(document_input(&book.id, "Chapter", 0))
        .await
        .unwrap();

    worker.delete_book(book.id.clone()).await.unwrap();
    assert_eq!(
        worker.get_book(book.id).await.unwrap_err().code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker.get_document(document.id).await.unwrap_err().code,
        PersistenceErrorCode::NotFound
    );
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn unknown_book_updates_and_deletes_are_not_found() {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let mut update = book_input("Missing");
    let error = worker
        .update_book(UpdateBookInput {
            id: "missing-book".into(),
            name: update.name,
            description: update.description,
            author: update.author,
            genre: update.genre,
            cover_image: update.cover_image.take(),
            tags: update.tags,
            settings: update.settings,
        })
        .await
        .unwrap_err();
    assert_eq!(error.code, PersistenceErrorCode::NotFound);
    assert_eq!(
        worker
            .delete_book("missing-book".into())
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    worker.shutdown().await.unwrap();
}
