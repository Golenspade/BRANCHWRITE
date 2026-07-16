mod support;

use app_lib::persistence::dto::{PersistenceErrorCode, SaveDocumentInput};
use app_lib::persistence::worker::{database_path, PersistenceWorker};
use rusqlite::{Connection, OpenFlags, TransactionBehavior};
use std::sync::mpsc;
use std::time::{Duration, Instant};
use support::{document_input, worker_and_book};

fn external_connection(path: &std::path::Path) -> Connection {
    Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .unwrap()
}

#[tokio::test]
async fn external_begin_immediate_times_out_as_retryable_busy_then_full_retry_succeeds() {
    let (temp, worker, book_id) = worker_and_book().await;
    let document = worker
        .create_document(document_input(&book_id, "Locked", 0))
        .await
        .unwrap();
    let path = database_path(temp.path());
    let (locked_tx, locked_rx) = mpsc::sync_channel(1);
    let (release_tx, release_rx) = mpsc::sync_channel(1);
    let locker = std::thread::spawn(move || {
        let mut connection = external_connection(&path);
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .unwrap();
        locked_tx.send(()).unwrap();
        release_rx.recv().unwrap();
        transaction.rollback().unwrap();
    });
    locked_rx.recv().unwrap();

    let input = SaveDocumentInput {
        document_id: document.id.clone(),
        content: "after lock".into(),
        expected_revision: 0,
    };
    let started = Instant::now();
    let error = worker.save_document(input.clone()).await.unwrap_err();
    let waited = started.elapsed();
    assert_eq!(error.code, PersistenceErrorCode::DatabaseBusy);
    assert_eq!(error.message, "database is busy");
    assert!(error.retryable);
    assert!(
        waited >= Duration::from_millis(4_500),
        "returned after {waited:?}"
    );
    assert!(waited < Duration::from_secs(8), "returned after {waited:?}");
    assert_eq!(
        worker.get_document(document.id.clone()).await.unwrap(),
        document
    );

    release_tx.send(()).unwrap();
    locker.join().unwrap();
    let saved = worker.save_document(input).await.unwrap();
    assert_eq!(saved.content, "after lock");
    assert_eq!(saved.revision, 1);
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn wal_reader_sees_last_commit_while_an_external_writer_is_uncommitted() {
    let (temp, worker, book_id) = worker_and_book().await;
    let mut create = document_input(&book_id, "Last committed", 0);
    create.content = "committed".into();
    let document = worker.create_document(create).await.unwrap();
    let path = database_path(temp.path());
    let writer_path = path.clone();
    let document_id = document.id.clone();
    let (updated_tx, updated_rx) = mpsc::sync_channel(1);
    let (release_tx, release_rx) = mpsc::sync_channel(1);
    let writer = std::thread::spawn(move || {
        let mut connection = external_connection(&writer_path);
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .unwrap();
        transaction
            .execute(
                "UPDATE documents SET content = 'uncommitted' WHERE id = ?1",
                [&document_id],
            )
            .unwrap();
        updated_tx.send(()).unwrap();
        release_rx.recv().unwrap();
        transaction.rollback().unwrap();
    });
    updated_rx.recv().unwrap();

    let reader = external_connection(&path);
    reader.busy_timeout(Duration::ZERO).unwrap();
    let visible: String = reader
        .query_row(
            "SELECT content FROM documents WHERE id = ?1",
            [&document.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(visible, "committed");
    release_tx.send(()).unwrap();
    writer.join().unwrap();
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn long_read_holds_a_snapshot_across_commit_then_checkpoint_and_reopen() {
    let (temp, worker, book_id) = worker_and_book().await;
    let mut create = document_input(&book_id, "Snapshot", 0);
    create.content = "v1".into();
    let document = worker.create_document(create).await.unwrap();
    let path = database_path(temp.path());
    let mut reader = external_connection(&path);
    let snapshot = reader
        .transaction_with_behavior(TransactionBehavior::Deferred)
        .unwrap();
    let initial: String = snapshot
        .query_row(
            "SELECT content FROM documents WHERE id = ?1",
            [&document.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(initial, "v1");

    let saved = worker
        .save_document(SaveDocumentInput {
            document_id: document.id.clone(),
            content: "v2".into(),
            expected_revision: 0,
        })
        .await
        .unwrap();
    let still_initial: String = snapshot
        .query_row(
            "SELECT content FROM documents WHERE id = ?1",
            [&document.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(still_initial, "v1");
    snapshot.commit().unwrap();
    let after_snapshot: String = reader
        .query_row(
            "SELECT content FROM documents WHERE id = ?1",
            [&document.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(after_snapshot, "v2");
    drop(reader);

    let checkpointer = external_connection(&path);
    let checkpoint: (i64, i64, i64) = checkpointer
        .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .unwrap();
    assert_eq!(checkpoint.0, 0, "checkpoint remained busy: {checkpoint:?}");
    assert_eq!(checkpoint.1, checkpoint.2);
    drop(checkpointer);
    worker.shutdown().await.unwrap();

    let worker = PersistenceWorker::start(temp.path()).unwrap();
    assert_eq!(worker.get_document(document.id).await.unwrap(), saved);
    worker.shutdown().await.unwrap();
}
