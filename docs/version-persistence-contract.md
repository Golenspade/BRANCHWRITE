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
setting back. Tauri manages a typed startup state containing either the ready
worker or the original structured startup error. A migration or storage failure
therefore keeps the WebView alive; every persistence command replays that error so
the frontend can render its blocking desktop error page without falling back to
Demo storage. Required settings are:

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

The worker exposes one explicit typed request for health, shutdown, and each
domain operation. All fifteen registered Tauri persistence commands use the SQLite
worker only:

- Books: `list_books`, `get_book`, `create_book`, `update_book`, and `delete_book`.
- Documents: `list_documents`, `get_document`, `create_document`,
  `update_document_metadata`, `save_document`, and `delete_document`.
- Versions: `list_versions`, `get_version`, `create_version`, and `restore_version`.

Legacy filesystem book/document functions, project commands, and the legacy
`.branchwrite` app-data path command are not registered. Production builder
construction does not initialize `FileSystemManager` or probe/create the legacy
storage tree.

Shared input and output DTOs serialize camelCase names and use signed 64-bit
epoch-millisecond timestamp fields. Document summaries omit content and hashes;
document details include both and are loaded only when a document is opened.
Version lists likewise return content-free summaries, while `get_version` lazily
loads a detail containing the immutable full text for View and Diff. Failures cross
the boundary as camelCase-
serialized `PersistenceError { code, message, retryable }`; codes are
`databaseBusy`, `conflict`, `notFound`, `validation`, `migrationFailed`,
`storageUnavailable`, and `internal`. No untyped SQL string or connection handle
crosses the Rust boundary.

## Book and document mutations

Rust generates UUIDs and timestamps and computes SHA-256, Unicode-scalar
character counts, and Unicode-whitespace word counts. Every create, update,
save, and delete uses an `IMMEDIATE` transaction. Book metadata updates replace
all metadata fields, and permanent book deletion cascades to its documents and
versions.

Document metadata updates and content saves compare `expectedRevision` inside
the same transaction that performs the write. A stale revision is a conflict,
including when the proposed values otherwise match. A current no-op returns the
unchanged detail without incrementing its revision; each changed update
increments the revision exactly once.

## Immutable version operations

`create_version` receives a caller-generated `operationId`, the caller's current
full content, a message, and `expectedRevision`. One `IMMEDIATE` transaction checks
the revision, updates the authoritative document body and derived hash/statistics,
allocates the next strictly increasing per-document sequence, and inserts the
immutable `manual` snapshot. An explicit manual save always creates a version,
including when it has identical content to the previous snapshot. Each row links to
the previous same-document version through `parent_version_id`.

Committed operation IDs are idempotent: replaying the same logical request returns
the committed result, while reusing an operation ID with different arguments is a
conflict. Sequence allocation and parent linkage are part of the same atomic write,
so a failed request leaves neither a document update nor a partial version row.

`restore_version` also requires a caller-generated `operationId` and
`expectedRevision`. In one `IMMEDIATE` transaction it first records the current
body as a `restoreSafety` full snapshot, then records the target body as a `restore`
snapshot, updates the document, and links the restored row to its source through
`restored_from_version_id`. Both snapshots follow the same sequence/parent chain;
any failure rolls back the document, revision, safety snapshot, and restore snapshot
together. If the target content is already current, the command returns
`alreadyCurrent` and creates no records.

## Explicit exclusions

- No raw SQL command is registered or exposed to frontend code.
- No automatic version origin or automatic version creation is supported.
- No version update, version delete, version tag, or retention-cleanup API is
  supported; version rows are removed only by document/book foreign-key cascades.
- No legacy file, browser `localStorage` value, or `branchwrite.db` database is
  read, written, imported, migrated, or deleted by this persistence layer.
- No schema downgrade or destructive migration is supported.
