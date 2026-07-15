export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export interface Book {
  id: string
  name: string
  description: string
  author: string
  genre: string
  coverImage: string | null
  tags: string[]
  settings: JsonValue
  createdAtMs: number
  updatedAtMs: number
}

export interface CreateBookInput {
  name: string
  description: string
  author: string
  genre: string
  coverImage: string | null
  tags: string[]
  settings: JsonValue
}

export interface UpdateBookInput extends CreateBookInput { id: string }

export interface DocumentSummary {
  id: string
  bookId: string
  title: string
  sortOrder: number
  documentType: string
  status: string
  wordCount: number
  characterCount: number
  revision: number
  versionSequence: number
  createdAtMs: number
  updatedAtMs: number
}

export interface DocumentDetail extends DocumentSummary {
  content: string
  contentHash: string
}

export interface CreateDocumentInput {
  bookId: string
  title: string
  sortOrder: number
  documentType: string
  status: string
  content: string
}

export interface UpdateDocumentMetadataInput {
  documentId: string
  title: string
  sortOrder: number
  documentType: string
  status: string
  expectedRevision: number
}

export interface SaveDocumentInput {
  documentId: string
  content: string
  expectedRevision: number
}

export interface VersionSummary {
  id: string
  operationId: string
  documentId: string
  sequence: number
  parentVersionId: string | null
  restoredFromVersionId: string | null
  message: string
  origin: string
  contentHash: string
  wordCount: number
  characterCount: number
  createdAtMs: number
}

export interface VersionDetail extends VersionSummary { content: string }

export interface CreateVersionInput {
  operationId: string
  documentId: string
  content: string
  message: string
  expectedRevision: number
}

export interface RestoreVersionInput {
  operationId: string
  documentId: string
  targetVersionId: string
  expectedRevision: number
}

export interface RestoreVersionResult {
  alreadyCurrent: boolean
  safetyVersion: VersionSummary | null
  restoredVersion: VersionSummary | null
}

export type PersistenceErrorCode =
  | 'databaseBusy'
  | 'conflict'
  | 'notFound'
  | 'validation'
  | 'migrationFailed'
  | 'storageUnavailable'
  | 'internal'

export interface PersistenceError {
  code: PersistenceErrorCode
  message: string
  retryable: boolean
}
