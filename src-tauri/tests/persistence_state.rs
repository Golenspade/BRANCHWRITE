use app_lib::persistence::dto::PersistenceErrorCode;
use app_lib::persistence::state::PersistenceState;
use rusqlite::Connection;
use tempfile::TempDir;

#[tokio::test]
async fn startup_migration_failure_is_replayed_without_aborting_the_command_boundary() {
    let temp = TempDir::new().unwrap();
    let database = temp.path().join("branchwrite-v2.sqlite3");
    let connection = Connection::open(database).unwrap();
    connection
        .execute_batch("CREATE TABLE books (id INTEGER PRIMARY KEY);")
        .unwrap();
    drop(connection);

    let state = PersistenceState::start(temp.path());
    let first = match state.worker() {
        Ok(_) => panic!("migration collision must not produce a ready worker"),
        Err(error) => error,
    };
    let second = match state.worker() {
        Ok(_) => panic!("failed startup must remain failed"),
        Err(error) => error,
    };

    assert_eq!(first.code, PersistenceErrorCode::MigrationFailed);
    assert_eq!(first.message, "database migration failed");
    assert!(!first.retryable);
    assert_eq!(
        second, first,
        "the structured startup error must be replayable"
    );
    state.shutdown_blocking().unwrap();
    state.shutdown_blocking().unwrap();
}

#[test]
fn ready_state_forwards_to_the_single_typed_worker_and_shuts_down_safely() {
    let temp = TempDir::new().unwrap();
    let state = PersistenceState::start(temp.path());

    let runtime = tokio::runtime::Runtime::new().unwrap();
    let health = runtime.block_on(state.worker().unwrap().health()).unwrap();
    assert_eq!(health.worker_thread_name, "branchwrite-persistence");
    drop(runtime);

    state.shutdown_blocking().unwrap();
    state.shutdown_blocking().unwrap();
}
