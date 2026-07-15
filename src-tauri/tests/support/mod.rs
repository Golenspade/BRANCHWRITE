#![allow(dead_code)]

use app_lib::persistence::dto::{CreateBookInput, CreateDocumentInput};
use app_lib::persistence::worker::PersistenceWorker;
use serde_json::json;
use tempfile::TempDir;

pub fn book_input(name: &str) -> CreateBookInput {
    CreateBookInput {
        name: name.into(),
        description: format!("Description for {name}"),
        author: "Author".into(),
        genre: "fiction".into(),
        cover_image: Some("cover.png".into()),
        tags: vec!["draft".into(), "novel".into()],
        settings: json!({"theme": "dark", "fontSize": 18}),
    }
}

pub fn document_input(book_id: &str, title: &str, sort_order: i64) -> CreateDocumentInput {
    CreateDocumentInput {
        book_id: book_id.into(),
        title: title.into(),
        sort_order,
        document_type: "chapter".into(),
        status: "draft".into(),
        content: String::new(),
    }
}

pub async fn worker_and_book() -> (TempDir, PersistenceWorker, String) {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let book = worker.create_book(book_input("Book")).await.unwrap();
    (temp, worker, book.id)
}
