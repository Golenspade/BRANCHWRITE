use super::dto::{PersistenceError, PersistenceErrorCode};
use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};

fn embedded() -> Migrations<'static> {
    Migrations::new(vec![M::up(include_str!("migrations/v1.sql"))])
}

pub fn validate() -> Result<(), PersistenceError> {
    embedded().validate().map_err(migration_error)
}

pub fn migrate(connection: &mut Connection) -> Result<(), PersistenceError> {
    embedded().to_latest(connection).map_err(migration_error)
}

pub fn current_version(connection: &Connection) -> Result<i64, PersistenceError> {
    connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(migration_error_from_sqlite)
}

fn migration_error(_: rusqlite_migration::Error) -> PersistenceError {
    stable_migration_error()
}

fn migration_error_from_sqlite(_: rusqlite::Error) -> PersistenceError {
    stable_migration_error()
}

fn stable_migration_error() -> PersistenceError {
    PersistenceError::new(
        PersistenceErrorCode::MigrationFailed,
        "database migration failed",
        false,
    )
}
