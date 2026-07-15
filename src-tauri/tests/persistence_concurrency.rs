mod support;

use app_lib::persistence::dto::{PersistenceErrorCode, SaveDocumentInput};
use support::{document_input, worker_and_book};

#[tokio::test]
async fn two_writes_with_the_same_expected_revision_allow_exactly_one_winner() {
    let (_temp, worker, book_id) = worker_and_book().await;
    let document = worker
        .create_document(document_input(&book_id, "Concurrent", 0))
        .await
        .unwrap();
    let left = SaveDocumentInput {
        document_id: document.id.clone(),
        content: "left".into(),
        expected_revision: 0,
    };
    let right = SaveDocumentInput {
        content: "right".into(),
        ..left.clone()
    };

    let (left_result, right_result) =
        tokio::join!(worker.save_document(left), worker.save_document(right),);
    let results = [left_result, right_result];
    assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
    let loser = results
        .iter()
        .find_map(|result| result.as_ref().err())
        .unwrap();
    assert_eq!(loser.code, PersistenceErrorCode::Conflict);

    let stored = worker.get_document(document.id).await.unwrap();
    assert_eq!(stored.revision, 1);
    assert!(stored.content == "left" || stored.content == "right");
    worker.shutdown().await.unwrap();
}
