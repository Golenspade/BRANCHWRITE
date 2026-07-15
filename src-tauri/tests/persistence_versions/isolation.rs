use crate::support::worker_and_book;
use crate::version_test_support::{create_document, create_version_input, operation_id};
use app_lib::persistence::dto::{
    CreateVersionInput, PersistenceErrorCode, RestoreVersionInput, SaveDocumentInput,
};

#[tokio::test]
async fn version_queries_and_operations_are_isolated_by_document() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let first_document = create_document(&worker, &book_id, "First", "first current").await;
    let second_document = create_document(&worker, &book_id, "Second", "second current").await;
    let first_version = worker
        .create_version(create_version_input(
            20,
            &first_document.id,
            "first private content",
            "First save",
            0,
        ))
        .await
        .unwrap();
    let second_version = worker
        .create_version(create_version_input(
            21,
            &second_document.id,
            "second private content",
            "Second save",
            0,
        ))
        .await
        .unwrap();

    assert_eq!(
        worker
            .get_version(first_document.id.clone(), second_version.id.clone())
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker
            .list_versions("missing-document".into())
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker
            .restore_version(RestoreVersionInput {
                operation_id: operation_id(22),
                document_id: first_document.id.clone(),
                target_version_id: second_version.id,
                expected_revision: 1,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::NotFound
    );
    assert_eq!(
        worker
            .create_version(CreateVersionInput {
                document_id: second_document.id.clone(),
                content: "other".into(),
                message: "Other".into(),
                expected_revision: 1,
                operation_id: first_version.operation_id,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Conflict
    );
    assert_eq!(
        worker.list_versions(first_document.id).await.unwrap().len(),
        1
    );
    assert_eq!(
        worker
            .list_versions(second_document.id)
            .await
            .unwrap()
            .len(),
        1
    );
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn already_current_restore_is_a_validated_noop_and_does_not_claim_operation_id() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    let target = worker
        .create_version(create_version_input(
            40,
            &document.id,
            "current",
            "Current",
            0,
        ))
        .await
        .unwrap();
    let before = worker.get_document(document.id.clone()).await.unwrap();
    let input = RestoreVersionInput {
        operation_id: operation_id(41),
        document_id: document.id.clone(),
        target_version_id: target.id,
        expected_revision: 1,
    };

    let result = worker.restore_version(input.clone()).await.unwrap();
    assert!(result.already_current);
    assert_eq!(result.safety_version, None);
    assert_eq!(result.restored_version, None);
    assert_eq!(
        worker.get_document(document.id.clone()).await.unwrap(),
        before
    );
    assert_eq!(
        worker
            .list_versions(document.id.clone())
            .await
            .unwrap()
            .len(),
        1
    );

    let changed = worker
        .save_document(SaveDocumentInput {
            document_id: document.id.clone(),
            content: "changed without a version".into(),
            expected_revision: 1,
        })
        .await
        .unwrap();
    let performed = worker
        .restore_version(RestoreVersionInput {
            expected_revision: changed.revision,
            ..input
        })
        .await
        .unwrap();
    assert!(!performed.already_current);
    assert!(performed.safety_version.is_some());
    assert!(performed.restored_version.is_some());
    assert_eq!(worker.list_versions(document.id).await.unwrap().len(), 3);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn restore_rejects_invalid_operation_ids_before_mutation() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = create_document(&worker, &book_id, "Chapter", "initial").await;
    assert_eq!(
        worker
            .restore_version(RestoreVersionInput {
                operation_id: "invalid".into(),
                document_id: document.id.clone(),
                target_version_id: "missing".into(),
                expected_revision: 0,
            })
            .await
            .unwrap_err()
            .code,
        PersistenceErrorCode::Validation
    );
    assert!(worker.list_versions(document.id).await.unwrap().is_empty());
    worker.shutdown().await.unwrap();
}
