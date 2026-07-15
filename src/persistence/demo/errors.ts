import type {
  CreateBookInput, CreateDocumentInput, PersistenceError, PersistenceErrorCode,
  UpdateDocumentMetadataInput,
} from '../contracts'

const messages: Record<PersistenceErrorCode, string> = {
  databaseBusy: 'database is busy',
  conflict: 'revision conflict',
  notFound: 'record not found',
  validation: 'invalid persistence input',
  migrationFailed: 'migration failed',
  storageUnavailable: 'storage unavailable',
  internal: 'persistence operation failed',
}

export function persistenceError(code: PersistenceErrorCode): PersistenceError {
  return { code, message: messages[code], retryable: code === 'databaseBusy' }
}

export function fail(code: PersistenceErrorCode): never { throw persistenceError(code) }

export function validateText(value: string) {
  if (!value.trim() || value.includes('\0')) fail('validation')
}

export function validateRevision(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) fail('validation')
}

export function validateBook(input: CreateBookInput) {
  validateText(input.name)
  if (input.tags.some((tag) => !tag.trim() || tag.includes('\0'))
    || !input.settings || typeof input.settings !== 'object' || Array.isArray(input.settings)) {
    fail('validation')
  }
}

export function validateDocument(input: CreateDocumentInput | UpdateDocumentMetadataInput) {
  validateText(input.title)
  if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0
    || !['chapter', 'section', 'note'].includes(input.documentType)
    || !['draft', 'review', 'final'].includes(input.status)) fail('validation')
}

export function validateOperationId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail('validation')
  }
}

export function nextSequence(current: number, increment: number) {
  const value = current + increment
  if (!Number.isSafeInteger(value)) fail('validation')
  return value
}
