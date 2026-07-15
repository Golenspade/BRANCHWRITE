CREATE TABLE books (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT 'general',
  cover_image TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(tags_json) AND json_type(tags_json) = 'array'),
  settings_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(settings_json) AND json_type(settings_json) = 'object'),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms)
) STRICT;

CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  book_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  document_type TEXT NOT NULL CHECK (document_type IN ('chapter', 'section', 'note')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final')),
  content TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL
    CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  character_count INTEGER NOT NULL DEFAULT 0 CHECK (character_count >= 0),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  version_sequence INTEGER NOT NULL DEFAULT 0 CHECK (version_sequence >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= created_at_ms),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY NOT NULL,
  operation_id TEXT NOT NULL UNIQUE CHECK (length(trim(operation_id)) > 0),
  document_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  parent_version_id TEXT,
  restored_from_version_id TEXT,
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  origin TEXT NOT NULL CHECK (origin IN ('manual', 'restoreSafety', 'restore')),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL
    CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
  word_count INTEGER NOT NULL CHECK (word_count >= 0),
  character_count INTEGER NOT NULL CHECK (character_count >= 0),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0),
  UNIQUE (document_id, sequence),
  UNIQUE (document_id, id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id, parent_version_id)
    REFERENCES document_versions(document_id, id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (document_id, restored_from_version_id)
    REFERENCES document_versions(document_id, id) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE INDEX idx_documents_book_order
  ON documents(book_id, sort_order, id);
CREATE INDEX idx_document_versions_document_sequence_desc
  ON document_versions(document_id, sequence DESC);
