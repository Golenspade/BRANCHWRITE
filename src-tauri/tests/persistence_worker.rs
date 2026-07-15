use app_lib::persistence::dto::PersistenceErrorCode;
use app_lib::persistence::worker::{
    database_path, validate_sqlite_version, PersistenceWorker, DATABASE_FILE_NAME,
    MINIMUM_SQLITE_VERSION, REQUEST_QUEUE_CAPACITY, WORKER_THREAD_NAME,
};
use rusqlite::Connection;
use tempfile::TempDir;

#[test]
fn sqlite_runtime_meets_the_required_minimum() {
    assert_eq!(MINIMUM_SQLITE_VERSION, "3.51.3");
    validate_sqlite_version(rusqlite::version()).expect("bundled SQLite must be supported");
    let error = validate_sqlite_version("3.51.2").unwrap_err();
    assert_eq!(error.code, PersistenceErrorCode::StorageUnavailable);
    assert!(!error.retryable);
}

#[test]
fn database_path_is_isolated_under_the_tauri_app_data_directory() {
    let temp = TempDir::new().unwrap();
    assert_eq!(DATABASE_FILE_NAME, "branchwrite-v2.sqlite3");
    assert_eq!(
        database_path(temp.path()),
        temp.path().join("branchwrite-v2.sqlite3")
    );
}

#[tokio::test]
async fn worker_starts_with_verified_pragmas_and_shuts_down_deterministically() {
    assert_eq!(REQUEST_QUEUE_CAPACITY, 64);
    let temp = TempDir::new().unwrap();
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let health = worker.health().await.unwrap();

    assert_eq!(health.worker_thread_name, WORKER_THREAD_NAME);
    assert_eq!(health.user_version, 1);
    assert_eq!(health.journal_mode, "wal");
    assert_eq!(health.synchronous, 2);
    assert!(health.foreign_keys);
    assert_eq!(health.busy_timeout_ms, 5_000);
    assert_eq!(health.locking_mode, "normal");
    assert_eq!(health.wal_autocheckpoint, 1_000);
    let path = database_path(temp.path());
    assert!(path.is_file());
    assert!(path
        .with_file_name(format!("{DATABASE_FILE_NAME}-wal"))
        .is_file());
    assert!(path
        .with_file_name(format!("{DATABASE_FILE_NAME}-shm"))
        .is_file());

    worker.shutdown().await.unwrap();
}

#[tokio::test]
async fn worker_reopens_an_existing_database_idempotently() {
    let temp = TempDir::new().unwrap();
    for _ in 0..2 {
        let worker = PersistenceWorker::start(temp.path()).unwrap();
        assert_eq!(worker.health().await.unwrap().user_version, 1);
        worker.shutdown().await.unwrap();
    }
}

#[test]
fn startup_reports_stable_migration_error_and_preserves_rollback() {
    let temp = TempDir::new().unwrap();
    let path = database_path(temp.path());
    let connection = Connection::open(&path).unwrap();
    connection
        .execute("CREATE TABLE documents (collision INTEGER)", [])
        .unwrap();
    drop(connection);

    let error = match PersistenceWorker::start(temp.path()) {
        Ok(worker) => {
            drop(worker);
            panic!("startup should fail")
        }
        Err(error) => error,
    };
    assert_eq!(error.code, PersistenceErrorCode::MigrationFailed);
    assert_eq!(error.message, "database migration failed");
    assert!(!error.retryable);

    let connection = Connection::open(path).unwrap();
    let books: i64 = connection
        .query_row(
            "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = 'books'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let version: i64 = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap();
    assert_eq!((books, version), (0, 0));
}

#[test]
fn startup_reports_stable_storage_error_when_app_data_is_not_a_directory() {
    let temp = TempDir::new().unwrap();
    let file_path = temp.path().join("not-a-directory");
    std::fs::write(&file_path, b"file").unwrap();

    let error = match PersistenceWorker::start(&file_path) {
        Ok(worker) => {
            drop(worker);
            panic!("startup should fail")
        }
        Err(error) => error,
    };
    assert_eq!(error.code, PersistenceErrorCode::StorageUnavailable);
    assert_eq!(error.message, "persistence storage is unavailable");
    assert!(!error.retryable);
}
