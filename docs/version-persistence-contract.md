# Version persistence contract

## Storage and migrations

The desktop application owns one database at
`<Tauri app_data_dir>/branchwrite-v2.sqlite3`. The v1 migration is append-only,
embedded in the Rust binary with `include_str!`, validated, and applied by
`rusqlite_migration`. Only that migration layer may read or advance
`PRAGMA user_version` as migration state; application requests must never set it.

The database uses SQLite `STRICT` tables. `books` requires non-empty names,
valid array/object JSON for tags and settings, and non-negative epoch-millisecond
timestamps with `updated_at_ms >= created_at_ms`. `documents` belongs to a book
with cascading deletion, restricts type and status values, stores the
authoritative full content, lowercase SHA-256 hash, non-negative statistics,
revision, version sequence, and millisecond timestamps.

`document_versions` is an immutable full-snapshot history. `operation_id` is
globally unique, `sequence` is positive and unique within a document, and both
parent and restore-source references use composite foreign keys so a version
cannot reference another document's history. Origins are exactly `manual`,
`restoreSafety`, or `restore`. Document order and descending document-version
history have dedicated indexes.

## Connection ownership and startup

One named OS thread (`branchwrite-persistence`) owns the only `rusqlite::Connection`
used by this persistence layer for the worker's full lifetime. Async callers send
typed requests through a bounded Tokio mpsc queue with capacity 64. Every request
has its own typed Tokio oneshot response. The design does not use a mutex-wrapped
connection, boxed closures, a generic connection callback, or arbitrary SQL
requests.

Before reporting startup success, the worker rejects SQLite versions older than
3.51.3, configures the connection, validates and runs migrations, and reads every
setting back. Required settings are:

| Setting | Required value |
| --- | --- |
| `journal_mode` | `WAL` |
| `synchronous` | `FULL` |
| `foreign_keys` | `ON` |
| `busy_timeout` | `5000` milliseconds |
| `locking_mode` | `NORMAL` |
| `wal_autocheckpoint` | `1000` pages |

Shutdown is a typed request. The worker acknowledges it, drops the connection on
its owner thread, and joins that thread before shutdown returns. Dropping the
worker also closes the queue and joins the thread deterministically.

## Typed command boundary

Task 1 exposes only the internal typed `Health` and `Shutdown` worker requests.
`Health` returns the SQLite version, migration version, worker thread name, and
verified PRAGMA values. Failures cross the boundary as camelCase-serialized
`PersistenceError { code, message, retryable }`; codes are `databaseBusy`,
`conflict`, `notFound`, `validation`, `migrationFailed`, `storageUnavailable`,
and `internal`.

Shared book, document, and version DTOs serialize camelCase names and use signed
64-bit epoch-millisecond timestamp fields. No untyped SQL string or connection
handle crosses the Rust boundary.

## Explicit exclusions

- No book, document, save, restore, or version-list domain handler is part of
  this foundation task.
- No raw SQL command is registered or exposed to frontend code.
- No automatic version origin or automatic version creation is supported.
- No legacy file, browser `localStorage` value, or `branchwrite.db` database is
  read, written, imported, migrated, or deleted by this persistence layer.
- No schema downgrade or destructive migration is supported.
