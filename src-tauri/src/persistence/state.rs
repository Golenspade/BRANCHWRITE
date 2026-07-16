use super::dto::PersistenceError;
use super::worker::PersistenceWorker;
use std::path::Path;

pub enum PersistenceState {
    Ready(PersistenceWorker),
    Failed(PersistenceError),
}

impl PersistenceState {
    pub fn start(app_data_dir: impl AsRef<Path>) -> Self {
        match PersistenceWorker::start(app_data_dir) {
            Ok(worker) => Self::Ready(worker),
            Err(error) => Self::Failed(error),
        }
    }

    pub fn failed(error: PersistenceError) -> Self {
        Self::Failed(error)
    }

    pub fn worker(&self) -> Result<&PersistenceWorker, PersistenceError> {
        match self {
            Self::Ready(worker) => Ok(worker),
            Self::Failed(error) => Err(error.clone()),
        }
    }

    pub fn shutdown_blocking(&self) -> Result<(), PersistenceError> {
        match self {
            Self::Ready(worker) => worker.shutdown_blocking(),
            Self::Failed(_) => Ok(()),
        }
    }
}
