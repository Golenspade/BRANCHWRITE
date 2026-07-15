use crate::support::worker_and_book;
use crate::version_test_support::{create_document, create_version_input, operation_id};
use app_lib::persistence::dto::{CreateVersionInput, PersistenceErrorCode, RestoreVersionInput};
use app_lib::persistence::worker::PersistenceWorker;
use serde_json::json;

const UNICODE_CONTENT: &str = "你好 👋\nRust\t世界";
const UNICODE_HASH: &str = "fd6a9d36750ba11195d855b6b3e435e7cb4a9f7bb4b70d7e4278963f5d11a782";

#[tokio::test]
async fn manual_versions_are_immutable_ordered_snapshots_that_survive_reopen() {
    let (temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    let first = worker
        .create_version(create_version_input(
            1,
            &document.id,
            UNICODE_CONTENT,
            "Manual save",
            0,
        ))
        .await
        .unwrap();
    let second = worker
        .create_version(create_version_input(
            2,
            &document.id,
            UNICODE_CONTENT,
            "Manual save",
            1,
        ))
        .await
        .unwrap();

    assert_ne!(first.id, second.id);
    assert_eq!((first.sequence, second.sequence), (1, 2));
    assert_eq!(first.parent_version_id, None);
    assert_eq!(second.parent_version_id.as_deref(), Some(first.id.as_str()));
    assert_eq!(
        (first.origin.as_str(), second.origin.as_str()),
        ("manual", "manual")
    );
    assert_eq!(first.content, UNICODE_CONTENT);
    assert_eq!(second.content, first.content);
    assert_eq!(first.content_hash, UNICODE_HASH);
    assert_eq!(second.content_hash, UNICODE_HASH);
    assert_eq!((first.word_count, first.character_count), (4, 12));
    assert_eq!((second.word_count, second.character_count), (4, 12));
    assert!(first.created_at_ms > document.updated_at_ms);
    assert!(second.created_at_ms > first.created_at_ms);

    let current = worker.get_document(document.id.clone()).await.unwrap();
    assert_eq!((current.revision, current.version_sequence), (2, 2));
    assert_eq!(current.content, UNICODE_CONTENT);
    assert_eq!(current.content_hash, UNICODE_HASH);
    assert_eq!((current.word_count, current.character_count), (4, 12));
    assert_eq!(current.updated_at_ms, second.created_at_ms);

    let versions = worker.list_versions(document.id.clone()).await.unwrap();
    assert_eq!(
        versions
            .iter()
            .map(|version| version.id.clone())
            .collect::<Vec<_>>(),
        vec![second.id.clone(), first.id.clone()]
    );
    let summary_json = serde_json::to_value(&versions[0]).unwrap();
    assert!(summary_json.get("content").is_none());
    assert_eq!(summary_json["operationId"], json!(operation_id(2)));
    let detail = worker
        .get_version(document.id.clone(), first.id.clone())
        .await
        .unwrap();
    assert_eq!(detail, first);
    assert_eq!(
        serde_json::to_value(&detail).unwrap()["content"],
        json!(UNICODE_CONTENT)
    );
    worker.shutdown().await.unwrap();

    let worker = PersistenceWorker::start(temp.path()).unwrap();
    assert_eq!(
        worker.list_versions(document.id.clone()).await.unwrap(),
        versions
    );
    assert_eq!(
        worker
            .get_version(document.id, second.id.clone())
            .await
            .unwrap(),
        second
    );
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn create_operation_replays_after_revision_advances_and_changed_material_conflicts() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    let first_input = create_version_input(10, &document.id, "first", "First", 0);
    let first = worker.create_version(first_input.clone()).await.unwrap();
    worker
        .create_version(create_version_input(
            11,
            &document.id,
            "second",
            "Second",
            1,
        ))
        .await
        .unwrap();

    assert_eq!(
        worker.create_version(first_input.clone()).await.unwrap(),
        first
    );
    let current = worker.get_document(document.id.clone()).await.unwrap();
    assert_eq!((current.revision, current.version_sequence), (2, 2));
    let versions = worker.list_versions(document.id.clone()).await.unwrap();
    assert_eq!(versions.len(), 2);
    for changed in [
        CreateVersionInput {
            content: "changed".into(),
            ..first_input.clone()
        },
        CreateVersionInput {
            message: "Changed".into(),
            ..first_input.clone()
        },
        CreateVersionInput {
            message: " \n\t".into(),
            ..first_input.clone()
        },
        CreateVersionInput {
            message: "bad\0message".into(),
            ..first_input.clone()
        },
    ] {
        assert_eq!(
            worker.create_version(changed).await.unwrap_err().code,
            PersistenceErrorCode::Conflict
        );
    }
    assert_eq!(worker.get_document(document.id).await.unwrap(), current);
    assert_eq!(worker.list_versions(current.id).await.unwrap(), versions);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn version_writes_reject_invalid_inputs_and_stale_revisions_without_mutation() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    for invalid in [
        CreateVersionInput {
            operation_id: "not-a-uuid".into(),
            ..create_version_input(50, &document.id, "content", "Message", 0)
        },
        create_version_input(51, &document.id, "content", " \n\t", 0),
        create_version_input(52, &document.id, "content", "bad\0message", 0),
        create_version_input(53, &document.id, "content", "Message", -1),
    ] {
        assert_eq!(
            worker.create_version(invalid).await.unwrap_err().code,
            PersistenceErrorCode::Validation
        );
    }
    assert!(worker
        .list_versions(document.id.clone())
        .await
        .unwrap()
        .is_empty());

    let target = worker
        .create_version(create_version_input(
            54,
            &document.id,
            "target",
            "Target",
            0,
        ))
        .await
        .unwrap();
    let before = worker.get_document(document.id.clone()).await.unwrap();
    assert_eq!(
        worker
            .create_version(create_version_input(55, &document.id, "stale", "Stale", 0))
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Conflict
    );
    assert_eq!(
        worker
            .restore_version(RestoreVersionInput {
                operation_id: operation_id(56),
                document_id: document.id.clone(),
                target_version_id: target.id,
                expected_revision: 0,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Conflict
    );
    assert_eq!(
        worker.get_document(document.id.clone()).await.unwrap(),
        before
    );
    assert_eq!(worker.list_versions(document.id).await.unwrap().len(), 1);
    worker.shutdown().await.unwrap();
}
