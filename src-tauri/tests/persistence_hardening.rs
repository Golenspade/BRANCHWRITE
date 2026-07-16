mod support;

use app_lib::persistence::dto::{CreateVersionInput, PersistenceErrorCode};
use app_lib::persistence::worker::{database_path, PersistenceWorker};
use rusqlite::{Connection, OpenFlags};
use support::{document_input, worker_and_book};

const TWO_MIB: usize = 2 * 1024 * 1024;
const TWO_MIB_X_HASH: &str = "6932fd31e5daf4739b9fa78ff777b2831b0995cc1d0b0093cac80601902013bc";
const OPERATION_ID: &str = "00000000-0000-4000-8000-000000000701";

#[tokio::test]
async fn two_mib_current_and_version_snapshots_survive_an_exact_file_restart() {
    let (temp, worker, book_id) = worker_and_book().await;
    let mut input = document_input(&book_id, "Large", 0);
    input.content = String::new();
    let empty = worker.create_document(input).await.unwrap();
    assert_eq!((empty.word_count, empty.character_count), (0, 0));

    let content = "x".repeat(TWO_MIB);
    let version = worker
        .create_version(CreateVersionInput {
            operation_id: OPERATION_ID.into(),
            document_id: empty.id.clone(),
            content: content.clone(),
            message: "2 MiB snapshot".into(),
            expected_revision: 0,
        })
        .await
        .unwrap();
    assert_eq!(version.content.len(), TWO_MIB);
    assert_eq!(version.content_hash, TWO_MIB_X_HASH);
    assert_eq!(
        (version.word_count, version.character_count),
        (1, TWO_MIB as i64)
    );
    worker.shutdown().await.unwrap();

    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let reopened_document = worker.get_document(empty.id.clone()).await.unwrap();
    let reopened_version = worker
        .get_version(empty.id.clone(), version.id.clone())
        .await
        .unwrap();
    assert_eq!(reopened_document.content.as_bytes(), content.as_bytes());
    assert_eq!(reopened_version.content.as_bytes(), content.as_bytes());
    assert_eq!(reopened_document.content_hash, TWO_MIB_X_HASH);
    assert_eq!(reopened_version, version);
    assert_eq!(
        (
            reopened_document.revision,
            reopened_document.version_sequence
        ),
        (1, 1)
    );
    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn completed_database_reports_patched_sqlite_pragmas_and_both_integrity_checks() {
    let (temp, worker, _book_id) = worker_and_book().await;
    let health = worker.health().await.unwrap();
    assert_eq!(health.sqlite_version, "3.53.2");
    assert_eq!(health.journal_mode, "wal");
    assert_eq!(health.synchronous, 2);
    assert!(health.foreign_keys);
    assert_eq!(health.busy_timeout_ms, 5_000);
    assert_eq!(health.locking_mode, "normal");
    assert_eq!(health.wal_autocheckpoint, 1_000);
    worker.shutdown().await.unwrap();

    let path = database_path(temp.path());
    let connection = Connection::open_with_flags(
        &path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .unwrap();
    let runtime_version: String = connection
        .query_row("SELECT sqlite_version()", [], |row| row.get(0))
        .unwrap();
    assert_eq!(runtime_version, "3.53.2");
    assert!(version_at_least(&runtime_version, (3, 51, 3)));
    let integrity: String = connection
        .pragma_query_value(None, "integrity_check", |row| row.get(0))
        .unwrap();
    assert_eq!(integrity, "ok");
    let foreign_key_violations: i64 = connection
        .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(foreign_key_violations, 0);
    let shared_cache_enabled: i64 = connection
        .query_row(
            "SELECT count(*) FROM pragma_compile_options WHERE compile_options = 'ENABLE_SHARED_CACHE'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(shared_cache_enabled, 0);
}

#[tokio::test]
async fn create_version_trigger_failure_leaves_no_document_or_version_partial_write() {
    let (temp, worker, book_id) = worker_and_book().await;
    let mut create = document_input(&book_id, "Atomic", 0);
    create.content = "before".into();
    let document = worker.create_document(create).await.unwrap();
    let before = worker.get_document(document.id.clone()).await.unwrap();

    let connection = Connection::open(database_path(temp.path())).unwrap();
    connection
        .execute_batch(
            "CREATE TRIGGER abort_manual_version
             BEFORE INSERT ON document_versions
             WHEN NEW.origin = 'manual'
             BEGIN SELECT RAISE(ABORT, 'forced create rollback'); END;",
        )
        .unwrap();
    let error = worker
        .create_version(CreateVersionInput {
            operation_id: "00000000-0000-4000-8000-000000000702".into(),
            document_id: document.id.clone(),
            content: "after".into(),
            message: "Must roll back".into(),
            expected_revision: 0,
        })
        .await
        .unwrap_err();
    assert_eq!(error.code, PersistenceErrorCode::Validation);
    connection
        .execute_batch("DROP TRIGGER abort_manual_version")
        .unwrap();

    assert_eq!(
        worker.get_document(document.id.clone()).await.unwrap(),
        before
    );
    assert!(worker
        .list_versions(document.id.clone())
        .await
        .unwrap()
        .is_empty());
    let stored_state: (String, i64, i64) = connection
        .query_row(
            "SELECT content, revision, version_sequence FROM documents WHERE id = ?1",
            [&document.id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(stored_state, ("before".into(), 0, 0));
    worker.shutdown().await.unwrap();
}

fn version_at_least(version: &str, minimum: (u64, u64, u64)) -> bool {
    let mut parts = version.split('.').map(|part| part.parse::<u64>().unwrap());
    let actual = (
        parts.next().unwrap(),
        parts.next().unwrap(),
        parts.next().unwrap(),
    );
    actual >= minimum
}
