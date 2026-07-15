import { invoke } from '@tauri-apps/api/core'
import type { PersistenceError, PersistenceErrorCode } from './contracts'
import type { PersistenceGateway } from './gateway'
import type {
  Book, CreateBookInput, CreateDocumentInput, CreateVersionInput, DocumentDetail,
  DocumentSummary, RestoreVersionInput, RestoreVersionResult, SaveDocumentInput,
  UpdateBookInput, UpdateDocumentMetadataInput, VersionDetail, VersionSummary,
} from './contracts'

const errorCodes = new Set<PersistenceErrorCode>([
  'databaseBusy', 'conflict', 'notFound', 'validation', 'migrationFailed',
  'storageUnavailable', 'internal',
])

export function normalizePersistenceError(value: unknown): PersistenceError {
  if (value && typeof value === 'object') {
    const candidate = value as Partial<PersistenceError>
    if (errorCodes.has(candidate.code as PersistenceErrorCode)
      && typeof candidate.message === 'string'
      && typeof candidate.retryable === 'boolean') {
      return {
        code: candidate.code as PersistenceErrorCode,
        message: candidate.message,
        retryable: candidate.retryable,
      }
    }
  }
  return {
    code: 'internal',
    message: value instanceof Error ? value.message : String(value),
    retryable: false,
  }
}

export class TauriPersistenceGateway implements PersistenceGateway {
  private async call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    try {
      return await invoke<T>(command, args)
    } catch (error) {
      throw normalizePersistenceError(error)
    }
  }

  listBooks() { return this.call<Book[]>('list_books') }
  getBook(bookId: string) { return this.call<Book>('get_book', { bookId }) }
  createBook(input: CreateBookInput) { return this.call<Book>('create_book', { input }) }
  updateBook(input: UpdateBookInput) { return this.call<Book>('update_book', { input }) }
  deleteBook(bookId: string) { return this.call<void>('delete_book', { bookId }) }
  listDocuments(bookId: string) { return this.call<DocumentSummary[]>('list_documents', { bookId }) }
  getDocument(documentId: string) { return this.call<DocumentDetail>('get_document', { documentId }) }
  createDocument(input: CreateDocumentInput) {
    return this.call<DocumentDetail>('create_document', { input })
  }
  updateDocumentMetadata(input: UpdateDocumentMetadataInput) {
    return this.call<DocumentDetail>('update_document_metadata', { input })
  }
  saveDocument(input: SaveDocumentInput) {
    return this.call<DocumentDetail>('save_document', { input })
  }
  deleteDocument(documentId: string) {
    return this.call<void>('delete_document', { documentId })
  }
  listVersions(documentId: string) {
    return this.call<VersionSummary[]>('list_versions', { documentId })
  }
  getVersion(documentId: string, versionId: string) {
    return this.call<VersionDetail>('get_version', { documentId, versionId })
  }
  createVersion(input: CreateVersionInput) {
    return this.call<VersionDetail>('create_version', { input })
  }
  restoreVersion(input: RestoreVersionInput) {
    return this.call<RestoreVersionResult>('restore_version', { input })
  }
}
