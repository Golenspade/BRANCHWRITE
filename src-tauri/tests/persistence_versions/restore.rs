use crate::support::worker_and_book;
use crate::version_test_support::{create_document, create_version_input, operation_id};
use app_lib::persistence::dto::{CreateVersionInput, PersistenceErrorCode, RestoreVersionInput};
use app_lib::persistence::worker::database_path;
use rusqlite::Connection;

#[tokio::test]
async fn restore_creates_safety_and_restore_snapshots_with_source_links_and_replays() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    let target = worker
        .create_version(create_version_input(
            30,
            &document.id,
            "target text",
            "Target",
            0,
        ))
        .await
        .unwrap();
    let previous = worker
        .create_version(create_version_input(
            31,
            &document.id,
            "current text",
            "Current",
            1,
        ))
        .await
        .unwrap();
    let input = RestoreVersionInput {
        operation_id: operation_id(32),
        document_id: document.id.clone(),
        target_version_id: target.id.clone(),
        expected_revision: 2,
    };

    let restored = worker.restore_version(input.clone()).await.unwrap();
    assert!(!restored.already_current);
    let safety = restored.safety_version.clone().unwrap();
    let restore = restored.restored_version.clone().unwrap();
    assert_eq!((safety.sequence, restore.sequence), (3, 4));
    assert_eq!(safety.origin, "restoreSafety");
    assert_eq!(safety.message, "Restore safety snapshot");
    assert_eq!(
        safety.parent_version_id.as_deref(),
        Some(previous.id.as_str())
    );
    assert_eq!(safety.restored_from_version_id, None);
    assert!(uuid::Uuid::parse_str(&safety.operation_id).is_ok());
    assert_ne!(safety.operation_id, input.operation_id);
    assert_eq!(restore.operation_id, input.operation_id);
    assert_eq!(restore.origin, "restore");
    assert_eq!(restore.message, "Restored: Target");
    assert_eq!(
        restore.parent_version_id.as_deref(),
        Some(safety.id.as_str())
    );
    assert_eq!(
        restore.restored_from_version_id.as_deref(),
        Some(target.id.as_str())
    );
    assert_eq!(safety.created_at_ms, restore.created_at_ms);
    assert!(safety.created_at_ms > previous.created_at_ms);
    let safety_detail = worker
        .get_version(document.id.clone(), safety.id.clone())
        .await
        .unwrap();
    assert_eq!(safety_detail.content, previous.content);
    assert_eq!(safety_detail.content_hash, previous.content_hash);
    assert_eq!(
        (safety_detail.word_count, safety_detail.character_count),
        (previous.word_count, previous.character_count)
    );
    let restore_detail = worker
        .get_version(document.id.clone(), restore.id.clone())
        .await
        .unwrap();
    assert_eq!(restore_detail.content, target.content);
    assert_eq!(restore_detail.content_hash, target.content_hash);
    assert_eq!(
        (restore_detail.word_count, restore_detail.character_count),
        (target.word_count, target.character_count)
    );
    let current = worker.get_document(document.id.clone()).await.unwrap();
    assert_eq!(current.content, "target text");
    assert_eq!((current.revision, current.version_sequence), (3, 4));
    assert_eq!(current.updated_at_ms, restore.created_at_ms);

    worker
        .create_version(create_version_input(
            33,
            &document.id,
            "later text",
            "Later",
            3,
        ))
        .await
        .unwrap();
    assert_eq!(
        worker.restore_version(input.clone()).await.unwrap(),
        restored
    );
    assert_eq!(
        worker
            .list_versions(document.id.clone())
            .await
            .unwrap()
            .len(),
        5
    );
    assert_eq!(
        worker
            .restore_version(RestoreVersionInput {
                target_version_id: previous.id,
                ..input.clone()
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Conflict
    );
    assert_eq!(
        worker
            .create_version(CreateVersionInput {
                operation_id: input.operation_id,
                document_id: document.id,
                content: "kind conflict".into(),
                message: "Kind conflict".into(),
                expected_revision: 4,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Conflict
    );
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn persistent_trigger_failure_rolls_back_restore_snapshots_and_document_update() {
    let (temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    let target = worker
        .create_version(create_version_input(
            60,
            &document.id,
            "target",
            "Target",
            0,
        ))
        .await
        .unwrap();
    worker
        .create_version(create_version_input(
            61,
            &document.id,
            "current",
            "Current",
            1,
        ))
        .await
        .unwrap();
    let before_document = worker.get_document(document.id.clone()).await.unwrap();
    let before_versions = worker.list_versions(document.id.clone()).await.unwrap();

    let database = Connection::open(database_path(temp.path())).unwrap();
    database
        .execute_batch(
            "CREATE TRIGGER abort_restore_document_update
             BEFORE UPDATE OF content, version_sequence ON documents
             WHEN NEW.version_sequence = OLD.version_sequence + 2
             BEGIN SELECT RAISE(ABORT, 'forced restore rollback'); END;",
        )
        .unwrap();
    let result = worker
        .restore_version(RestoreVersionInput {
            operation_id: operation_id(62),
            document_id: document.id.clone(),
            target_version_id: target.id,
            expected_revision: 2,
        })
        .await;
    assert_eq!(result.unwrap_err().code, PersistenceErrorCode::Validation);
    database
        .execute_batch("DROP TRIGGER abort_restore_document_update;")
        .unwrap();

    assert_eq!(
        worker.get_document(document.id.clone()).await.unwrap(),
        before_document
    );
    assert_eq!(
        worker.list_versions(document.id.clone()).await.unwrap(),
        before_versions
    );
    let version_count: i64 = database
        .query_row(
            "SELECT count(*) FROM document_versions WHERE document_id = ?1",
            [&document.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(version_count, 2);
    worker.shutdown().await.unwrap();
}
