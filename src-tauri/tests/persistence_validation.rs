mod support;

use app_lib::persistence::dto::{
    PersistenceErrorCode, SaveDocumentInput, UpdateBookInput, UpdateDocumentMetadataInput,
};
use app_lib::persistence::worker::PersistenceWorker;
use serde_json::json;
use support::{book_input, document_input, worker_and_book};
use tempfile::TempDir;

#[tokio::test]
async fn invalid_book_inputs_are_validation_errors_without_mutation() {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let mut blank_name = book_input("valid");
    blank_name.name = " \n\t".into();
    assert_eq!(
        worker.create_book(blank_name).await.unwrap_err().code,
        PersistenceErrorCode::Validation
    );

    let mut nul_name = book_input("valid");
    nul_name.name = "bad\0name".into();
    assert_eq!(
        worker.create_book(nul_name).await.unwrap_err().code,
        PersistenceErrorCode::Validation
    );

    let mut blank_tag = book_input("valid");
    blank_tag.tags = vec!["ok".into(), "  ".into()];
    assert_eq!(
        worker.create_book(blank_tag).await.unwrap_err().code,
        PersistenceErrorCode::Validation
    );

    let mut array_settings = book_input("valid");
    array_settings.settings = json!([]);
    assert_eq!(
        worker.create_book(array_settings).await.unwrap_err().code,
        PersistenceErrorCode::Validation
    );
    assert!(worker.list_books().await.unwrap().is_empty());

    let existing = worker.create_book(book_input("Existing")).await.unwrap();
    let before = existing.clone();
    let invalid_update = UpdateBookInput {
        id: existing.id.clone(),
        name: "".into(),
        description: "changed".into(),
        author: "changed".into(),
        genre: "changed".into(),
        cover_image: None,
        tags: vec![],
        settings: json!({}),
    };
    assert_eq!(
        worker.update_book(invalid_update).await.unwrap_err().code,
        PersistenceErrorCode::Validation
    );
    assert_eq!(worker.get_book(existing.id).await.unwrap(), before);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn nul_tags_are_validation_errors() {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let mut nul_tag = book_input("valid");
    nul_tag.tags = vec!["bad\0tag".into()];
    let error = worker.create_book(nul_tag).await.unwrap_err();
    assert_eq!(error.code, PersistenceErrorCode::Validation);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn invalid_document_inputs_are_validation_errors_without_mutation() {
    let (_temp, worker, book_id) = worker_and_book().await;
    for invalid in [
        {
            document_input(&book_id, " ", 0)
        },
        {
            document_input(&book_id, "bad\0title", 0)
        },
        {
            document_input(&book_id, "Chapter", -1)
        },
        {
            let mut input = document_input(&book_id, "Chapter", 0);
            input.document_type = "appendix".into();
            input
        },
        {
            let mut input = document_input(&book_id, "Chapter", 0);
            input.status = "archived".into();
            input
        },
    ] {
        assert_eq!(
            worker.create_document(invalid).await.unwrap_err().code,
            PersistenceErrorCode::Validation
        );
    }
    assert!(worker
        .list_documents(book_id.clone())
        .await
        .unwrap()
        .is_empty());

    let missing_book = worker
        .create_document(document_input("missing-book", "Chapter", 0))
        .await
        .unwrap_err();
    assert_eq!(missing_book.code, PersistenceErrorCode::NotFound);

    let document = worker
        .create_document(document_input(&book_id, "Chapter", 0))
        .await
        .unwrap();
    let before = document.clone();
    let invalid_metadata = UpdateDocumentMetadataInput {
        document_id: document.id.clone(),
        title: "Changed".into(),
        sort_order: 0,
        document_type: "chapter".into(),
        status: "bad".into(),
        expected_revision: 0,
    };
    assert_eq!(
        worker
            .update_document_metadata(invalid_metadata)
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Validation
    );
    assert_eq!(
        worker.get_document(document.id.clone()).await.unwrap(),
        before
    );

    let negative_revision = SaveDocumentInput {
        document_id: document.id.clone(),
        content: "changed".into(),
        expected_revision: -1,
    };
    assert_eq!(
        worker
            .save_document(negative_revision)
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Validation
    );
    assert_eq!(worker.get_document(document.id).await.unwrap(), before);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn revisions_that_cannot_be_incremented_are_validation_errors() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = worker
        .create_document(document_input(&book_id, "Chapter", 0))
        .await
        .unwrap();
    let error = worker
        .save_document(SaveDocumentInput {
            document_id: document.id,
            content: "changed".into(),
            expected_revision: i64::MAX,
        })
        .await
        .unwrap_err();
    assert_eq!(error.code, PersistenceErrorCode::Validation);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn unknown_document_operations_are_not_found() {
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    assert_eq!(
        worker
            .get_document("missing".into())
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker
            .save_document(SaveDocumentInput {
                document_id: "missing".into(),
                content: "text".into(),
                expected_revision: 0,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker
            .update_document_metadata(UpdateDocumentMetadataInput {
                document_id: "missing".into(),
                title: "Title".into(),
                sort_order: 0,
                document_type: "chapter".into(),
                status: "draft".into(),
                expected_revision: 0,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    worker.shutdown().await.unwrap();
}
