mod support;

use app_lib::persistence::dto::{
    PersistenceErrorCode, SaveDocumentInput, UpdateDocumentMetadataInput,
};
use app_lib::persistence::worker::PersistenceWorker;
use serde_json::json;
use support::{document_input, worker_and_book};

const UNICODE_CONTENT: &str = "你好 👋\nRust\t世界";
const UNICODE_HASH: &str = "fd6a9d36750ba11195d855b6b3e435e7cb4a9f7bb4b70d7e4278963f5d11a782";

#[tokio::test]
async fn document_creation_owns_content_hash_unicode_stats_and_summary_shape() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let mut input = document_input(&book_id, "Unicode", 7);
    input.content = UNICODE_CONTENT.into();
    let detail = worker.create_document(input).await.unwrap();

    assert_eq!(detail.book_id, book_id);
    assert_eq!(detail.content, UNICODE_CONTENT);
    assert_eq!(detail.content_hash, UNICODE_HASH);
    assert_eq!(detail.character_count, 12);
    assert_eq!(detail.word_count, 4);
    assert_eq!(detail.revision, 0);
    assert_eq!(detail.version_sequence, 0);
    assert_eq!(detail.created_at_ms, detail.updated_at_ms);
    assert_eq!(
        worker.get_document(detail.id.clone()).await.unwrap(),
        detail
    );

    let summaries = worker.list_documents(book_id).await.unwrap();
    assert_eq!(summaries.len(), 1);
    let summary_json = serde_json::to_value(&summaries[0]).unwrap();
    assert!(summary_json.get("content").is_none());
    assert!(summary_json.get("contentHash").is_none());
    assert_eq!(summary_json["characterCount"], json!(12));
    let detail_json = serde_json::to_value(detail).unwrap();
    assert_eq!(detail_json["contentHash"], json!(UNICODE_HASH));
    assert!(detail_json.get("content_hash").is_none());
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn documents_have_stable_sort_order_and_survive_reopen() {
    let (temp, worker, book_id) = worker_and_book().await;
    let last = worker
        .create_document(document_input(&book_id, "Last", 9))
        .await
        .unwrap();
    let tied_a = worker
        .create_document(document_input(&book_id, "Tie A", 2))
        .await
        .unwrap();
    let tied_b = worker
        .create_document(document_input(&book_id, "Tie B", 2))
        .await
        .unwrap();
    let mut expected_tied_ids = [tied_a.id.clone(), tied_b.id.clone()];
    expected_tied_ids.sort();

    let documents = worker.list_documents(book_id.clone()).await.unwrap();
    assert_eq!(
        documents
            .iter()
            .map(|document| document.id.clone())
            .collect::<Vec<_>>(),
        vec![
            expected_tied_ids[0].clone(),
            expected_tied_ids[1].clone(),
            last.id.clone()
        ]
    );
    worker.shutdown().await.unwrap();

    let worker = PersistenceWorker::start(temp.path()).unwrap();
    assert_eq!(worker.get_document(last.id).await.unwrap().title, "Last");
    assert_eq!(worker.list_documents(book_id).await.unwrap().len(), 3);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn save_checks_revision_before_noop_and_only_changed_content_increments() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let mut create = document_input(&book_id, "Chapter", 0);
    create.content = "initial".into();
    let initial = worker.create_document(create).await.unwrap();

    let unchanged = worker
        .save_document(SaveDocumentInput {
            document_id: initial.id.clone(),
            content: initial.content.clone(),
            expected_revision: 0,
        })
        .await
        .unwrap();
    assert_eq!(unchanged, initial);

    let stale_noop = worker
        .save_document(SaveDocumentInput {
            document_id: initial.id.clone(),
            content: initial.content.clone(),
            expected_revision: 1,
        })
        .await
        .unwrap_err();
    assert_eq!(stale_noop.code, PersistenceErrorCode::Conflict);

    let changed = worker
        .save_document(SaveDocumentInput {
            document_id: initial.id.clone(),
            content: UNICODE_CONTENT.into(),
            expected_revision: 0,
        })
        .await
        .unwrap();
    assert_eq!(changed.revision, 1);
    assert_eq!(changed.content_hash, UNICODE_HASH);
    assert_eq!((changed.word_count, changed.character_count), (4, 12));
    assert!(changed.updated_at_ms > initial.updated_at_ms);

    let stale_overwrite = worker
        .save_document(SaveDocumentInput {
            document_id: initial.id.clone(),
            content: "lost update".into(),
            expected_revision: 0,
        })
        .await
        .unwrap_err();
    assert_eq!(stale_overwrite.code, PersistenceErrorCode::Conflict);
    assert_eq!(worker.get_document(initial.id).await.unwrap(), changed);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn metadata_checks_revision_before_noop_and_increments_once_when_changed() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let initial = worker
        .create_document(document_input(&book_id, "Chapter", 0))
        .await
        .unwrap();
    let unchanged_input = UpdateDocumentMetadataInput {
        document_id: initial.id.clone(),
        title: initial.title.clone(),
        sort_order: initial.sort_order,
        document_type: initial.document_type.clone(),
        status: initial.status.clone(),
        expected_revision: 0,
    };
    assert_eq!(
        worker
            .update_document_metadata(unchanged_input.clone())
            .await
            .unwrap(),
        initial
    );

    let mut stale_noop = unchanged_input.clone();
    stale_noop.expected_revision = 1;
    assert_eq!(
        worker
            .update_document_metadata(stale_noop)
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Conflict
    );

    let changed = worker
        .update_document_metadata(UpdateDocumentMetadataInput {
            title: "Renamed".into(),
            sort_order: 4,
            document_type: "section".into(),
            status: "review".into(),
            ..unchanged_input
        })
        .await
        .unwrap();
    assert_eq!(changed.revision, 1);
    assert_eq!(changed.title, "Renamed");
    assert_eq!(changed.content, initial.content);
    assert_eq!(changed.version_sequence, 0);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn document_delete_is_permanent_and_unknown_documents_are_not_found() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = worker
        .create_document(document_input(&book_id, "Delete", 0))
        .await
        .unwrap();
    worker.delete_document(document.id.clone()).await.unwrap();
    assert_eq!(
        worker
            .get_document(document.id.clone())
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker.delete_document(document.id).await.unwrap_err().code,
        PersistenceErrorCode::NotFound
    );
    worker.shutdown().await.unwrap();
}
