mod support;

use app_lib::persistence::dto::CreateVersionInput;
use app_lib::persistence::worker::{database_path, PersistenceWorker};
use rusqlite::{Connection, TransactionBehavior};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;
use std::process::{Command, Stdio};
use tempfile::TempDir;

const MODE_ENV: &str = "BRANCHWRITE_CRASH_CHILD_MODE";
const DATA_ENV: &str = "BRANCHWRITE_CRASH_DATA_DIR";
const UNCOMMITTED_BOOK_ID: &str = "uncommitted-crash-book";

#[test]
fn crash_child_entry() {
    let Some(mode) = std::env::var_os(MODE_ENV) else {
        return;
    };
    let data_dir = std::path::PathBuf::from(std::env::var_os(DATA_ENV).unwrap());
    match mode.to_str().unwrap() {
        "committed" => prepare_committed_child(&data_dir),
        "uncommitted" => prepare_uncommitted_child(&data_dir),
        unexpected => panic!("unexpected crash mode {unexpected}"),
    }
}

#[test]
fn committed_and_uncommitted_child_process_crashes_recover_without_corruption() {
    if std::env::var_os(MODE_ENV).is_some() {
        return;
    }
    let temp = TempDir::new().unwrap();
    run_until_ready_then_kill("committed", temp.path());

    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let books = runtime.block_on(worker.list_books()).unwrap();
    assert_eq!(books.len(), 1);
    assert_eq!(books[0].name, "Committed before crash");
    let documents = runtime
        .block_on(worker.list_documents(books[0].id.clone()))
        .unwrap();
    assert_eq!(documents.len(), 1);
    let detail = runtime
        .block_on(worker.get_document(documents[0].id.clone()))
        .unwrap();
    assert_eq!(detail.content, "已提交 👋");
    let versions = runtime
        .block_on(worker.list_versions(detail.id.clone()))
        .unwrap();
    assert_eq!(versions.len(), 1);
    let version = runtime
        .block_on(worker.get_version(detail.id.clone(), versions[0].id.clone()))
        .unwrap();
    assert_eq!(version.content, "已提交 👋");
    drop(runtime);
    worker.shutdown_blocking().unwrap();
    assert_integrity(temp.path());

    run_until_ready_then_kill("uncommitted", temp.path());
    let worker = PersistenceWorker::start(temp.path()).unwrap();
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let books = runtime.block_on(worker.list_books()).unwrap();
    assert_eq!(books.len(), 1);
    assert_eq!(books[0].name, "Committed before crash");
    assert!(runtime
        .block_on(worker.get_book(UNCOMMITTED_BOOK_ID.into()))
        .is_err());
    drop(runtime);
    worker.shutdown_blocking().unwrap();
    assert_integrity(temp.path());
}

fn run_until_ready_then_kill(mode: &str, data_dir: &Path) {
    let mut child = Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "crash_child_entry",
            "--nocapture",
            "--test-threads=1",
        ])
        .env(MODE_ENV, mode)
        .env(DATA_ENV, data_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let _keep_stdin_open = child.stdin.take().unwrap();
    let stdout = child.stdout.take().unwrap();
    let mut reader = BufReader::new(stdout);
    let expected = format!("BRANCHWRITE_CRASH_READY {mode}");
    let mut evidence = String::new();
    loop {
        let mut line = String::new();
        let bytes = reader.read_line(&mut line).unwrap();
        if bytes == 0 {
            let status = child.wait().unwrap();
            let stderr = child
                .stderr
                .take()
                .map(|stderr| std::io::read_to_string(stderr).unwrap())
                .unwrap_or_default();
            panic!(
                "child exited before readiness ({status}); stdout={evidence:?}; stderr={stderr:?}"
            );
        }
        evidence.push_str(&line);
        if line.contains(&expected) {
            break;
        }
    }
    child.kill().unwrap();
    let status = child.wait().unwrap();
    assert!(
        !status.success(),
        "crash child exited gracefully: {evidence}"
    );
}

fn assert_integrity(data_dir: &Path) {
    let connection = Connection::open(database_path(data_dir)).unwrap();
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
}

fn prepare_committed_child(data_dir: &Path) {
    let worker = PersistenceWorker::start(data_dir).unwrap();
    let runtime = tokio::runtime::Runtime::new().unwrap();
    runtime.block_on(async {
        let book = worker
            .create_book(support::book_input("Committed before crash"))
            .await
            .unwrap();
        let mut input = support::document_input(&book.id, "Committed document", 0);
        input.content = "empty before explicit version".into();
        let document = worker.create_document(input).await.unwrap();
        worker
            .create_version(CreateVersionInput {
                operation_id: "00000000-0000-4000-8000-000000000801".into(),
                document_id: document.id,
                content: "已提交 👋".into(),
                message: "Committed child version".into(),
                expected_revision: 0,
            })
            .await
            .unwrap();
    });
    wait_for_parent_kill("committed");
    drop(runtime);
    drop(worker);
}

fn prepare_uncommitted_child(data_dir: &Path) {
    let _worker = PersistenceWorker::start(data_dir).unwrap();
    let mut connection = Connection::open(database_path(data_dir)).unwrap();
    connection
        .pragma_update(None, "foreign_keys", true)
        .unwrap();
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    transaction
        .execute(
            "INSERT INTO books (id, name, created_at_ms, updated_at_ms)
             VALUES (?1, 'Must not survive', 1, 1)",
            [UNCOMMITTED_BOOK_ID],
        )
        .unwrap();
    wait_for_parent_kill("uncommitted");
    drop(transaction);
}

fn wait_for_parent_kill(mode: &str) {
    println!("BRANCHWRITE_CRASH_READY {mode}");
    std::io::stdout().flush().unwrap();
    let mut byte = [0_u8; 1];
    match std::io::stdin().read_exact(&mut byte) {
        Ok(()) => panic!("crash child was asked to exit gracefully"),
        Err(error) => panic!("crash child lost its parent before kill: {error}"),
    }
}
