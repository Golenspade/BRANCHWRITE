use super::dto::{PersistenceError, PersistenceErrorCode};
use super::migrations;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};

mod client;
mod dispatch;
mod requests;

pub use requests::Request;

pub const DATABASE_FILE_NAME: &str = "branchwrite-v2.sqlite3";
pub const MINIMUM_SQLITE_VERSION: &str = "3.51.3";
pub const REQUEST_QUEUE_CAPACITY: usize = 64;
pub const WORKER_THREAD_NAME: &str = "branchwrite-persistence";
const SQLITE_VERSION_ERROR: &str = "SQLite 3.51.3 or newer is required";
const STORAGE_ERROR: &str = "persistence storage is unavailable";
const WORKER_ERROR: &str = "persistence worker is unavailable";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub sqlite_version: String,
    pub user_version: i64,
    pub worker_thread_name: String,
    pub journal_mode: String,
    pub synchronous: i64,
    pub foreign_keys: bool,
    pub busy_timeout_ms: i64,
    pub locking_mode: String,
    pub wal_autocheckpoint: i64,
}

pub struct PersistenceWorker {
    sender: Option<mpsc::Sender<Request>>,
    join: Mutex<Option<JoinHandle<()>>>,
}

impl PersistenceWorker {
    pub fn start(app_data_dir: impl AsRef<Path>) -> Result<Self, PersistenceError> {
        std::fs::create_dir_all(app_data_dir.as_ref()).map_err(|_| storage_error())?;
        let path = database_path(app_data_dir.as_ref());
        let (sender, receiver) = mpsc::channel(REQUEST_QUEUE_CAPACITY);
        let (startup_sender, startup_receiver) = std::sync::mpsc::sync_channel(1);
        let join = thread::Builder::new()
            .name(WORKER_THREAD_NAME.to_string())
            .spawn(move || worker_loop(path, receiver, startup_sender))
            .map_err(|_| storage_error())?;

        match startup_receiver.recv() {
            Ok(Ok(())) => Ok(Self {
                sender: Some(sender),
                join: Mutex::new(Some(join)),
            }),
            Ok(Err(error)) => {
                let _ = join.join();
                Err(error)
            }
            Err(_) => {
                let _ = join.join();
                Err(worker_unavailable())
            }
        }
    }

    pub async fn health(&self) -> Result<Health, PersistenceError> {
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        sender
            .send(Request::Health { respond_to })
            .await
            .map_err(|_| worker_unavailable())?;
        response.await.map_err(|_| worker_unavailable())?
    }

    pub async fn shutdown(mut self) -> Result<(), PersistenceError> {
        let sender = self.sender.take().ok_or_else(worker_unavailable)?;
        let (respond_to, response) = oneshot::channel();
        let request_result = sender
            .send(Request::Shutdown { respond_to })
            .await
            .map_err(|_| worker_unavailable());
        drop(sender);
        let response_result = match request_result {
            Ok(()) => response.await.map_err(|_| worker_unavailable())?,
            Err(error) => Err(error),
        };
        let join_result = self
            .join
            .get_mut()
            .map_err(|_| worker_unavailable())?
            .take()
            .ok_or_else(worker_unavailable)?
            .join()
            .map_err(|_| worker_unavailable());
        response_result?;
        join_result
    }

    pub fn shutdown_blocking(&self) -> Result<(), PersistenceError> {
        let join = match self.join.lock().map_err(|_| worker_unavailable())?.take() {
            Some(join) => join,
            None => return Ok(()),
        };
        let sender = self.sender.as_ref().ok_or_else(worker_unavailable)?.clone();
        let (respond_to, response) = oneshot::channel();
        let request_result = sender
            .blocking_send(Request::Shutdown { respond_to })
            .map_err(|_| worker_unavailable());
        let response_result = match request_result {
            Ok(()) => response.blocking_recv().map_err(|_| worker_unavailable())?,
            Err(error) => Err(error),
        };
        let join_result = join.join().map_err(|_| worker_unavailable());
        response_result?;
        join_result
    }
}

impl Drop for PersistenceWorker {
    fn drop(&mut self) {
        self.sender.take();
        let joins = match self.join.get_mut() {
            Ok(joins) => joins,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(join) = joins.take() {
            let _ = join.join();
        }
    }
}

pub fn database_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(DATABASE_FILE_NAME)
}

pub fn validate_sqlite_version(version: &str) -> Result<(), PersistenceError> {
    let parsed = parse_version(version).ok_or_else(unsupported_version)?;
    let minimum = parse_version(MINIMUM_SQLITE_VERSION).expect("valid minimum SQLite version");
    if parsed < minimum {
        return Err(unsupported_version());
    }
    Ok(())
}

fn parse_version(version: &str) -> Option<(u64, u64, u64)> {
    let mut parts = version.split('.');
    let parsed = (
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
    );
    (parts.next().is_none()).then_some(parsed)
}

fn worker_loop(
    path: PathBuf,
    mut receiver: mpsc::Receiver<Request>,
    startup_sender: std::sync::mpsc::SyncSender<Result<(), PersistenceError>>,
) {
    let mut connection = match open_and_prepare(&path) {
        Ok(result) => result,
        Err(error) => {
            let _ = startup_sender.send(Err(error));
            return;
        }
    };
    if startup_sender.send(Ok(())).is_err() {
        return;
    }
    while let Some(request) = receiver.blocking_recv() {
        if dispatch::handle(&mut connection, request) {
            break;
        }
    }
}

fn open_and_prepare(path: &Path) -> Result<Connection, PersistenceError> {
    validate_sqlite_version(rusqlite::version())?;
    let mut connection = Connection::open(path).map_err(|_| storage_error())?;
    configure(&connection)?;
    migrations::validate()?;
    migrations::migrate(&mut connection)?;
    read_health(&connection)?;
    Ok(connection)
}

fn configure(connection: &Connection) -> Result<(), PersistenceError> {
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .and_then(|_| connection.pragma_update(None, "synchronous", "FULL"))
        .and_then(|_| connection.pragma_update(None, "foreign_keys", true))
        .and_then(|_| connection.busy_timeout(Duration::from_millis(5_000)))
        .and_then(|_| connection.pragma_update(None, "locking_mode", "NORMAL"))
        .and_then(|_| connection.pragma_update(None, "wal_autocheckpoint", 1_000))
        .map_err(|_| storage_error())
}

fn read_health(connection: &Connection) -> Result<Health, PersistenceError> {
    let health = Health {
        sqlite_version: rusqlite::version().to_string(),
        user_version: migrations::current_version(connection)?,
        worker_thread_name: thread::current().name().unwrap_or_default().to_string(),
        journal_mode: pragma_string(connection, "journal_mode")?,
        synchronous: pragma_i64(connection, "synchronous")?,
        foreign_keys: pragma_i64(connection, "foreign_keys")? == 1,
        busy_timeout_ms: pragma_i64(connection, "busy_timeout")?,
        locking_mode: pragma_string(connection, "locking_mode")?,
        wal_autocheckpoint: pragma_i64(connection, "wal_autocheckpoint")?,
    };
    verify_health(&health)?;
    Ok(health)
}

fn pragma_i64(connection: &Connection, name: &str) -> Result<i64, PersistenceError> {
    connection
        .pragma_query_value(None, name, |row| row.get(0))
        .map_err(|_| storage_error())
}

fn pragma_string(connection: &Connection, name: &str) -> Result<String, PersistenceError> {
    connection
        .pragma_query_value(None, name, |row| row.get(0))
        .map_err(|_| storage_error())
}

fn verify_health(health: &Health) -> Result<(), PersistenceError> {
    let valid = health.user_version == 1
        && health.worker_thread_name == WORKER_THREAD_NAME
        && health.journal_mode.eq_ignore_ascii_case("wal")
        && health.synchronous == 2
        && health.foreign_keys
        && health.busy_timeout_ms == 5_000
        && health.locking_mode.eq_ignore_ascii_case("normal")
        && health.wal_autocheckpoint == 1_000;
    valid.then_some(()).ok_or_else(|| {
        PersistenceError::new(
            PersistenceErrorCode::Internal,
            "database configuration verification failed",
            false,
        )
    })
}

fn unsupported_version() -> PersistenceError {
    error(
        PersistenceErrorCode::StorageUnavailable,
        SQLITE_VERSION_ERROR,
    )
}

fn storage_error() -> PersistenceError {
    error(PersistenceErrorCode::StorageUnavailable, STORAGE_ERROR)
}

fn worker_unavailable() -> PersistenceError {
    error(PersistenceErrorCode::Internal, WORKER_ERROR)
}

fn error(code: PersistenceErrorCode, message: &'static str) -> PersistenceError {
    PersistenceError::new(code, message, false)
}
