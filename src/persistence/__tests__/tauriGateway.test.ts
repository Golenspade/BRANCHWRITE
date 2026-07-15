import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizePersistenceError, TauriPersistenceGateway } from '../tauriGateway'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@tauri-apps/api/core', () => ({ invoke, isTauri: vi.fn() }))

const input = { marker: 'input' }
const cases = [
  ['listBooks', 'list_books', undefined],
  ['getBook', 'get_book', { bookId: 'book-1' }],
  ['createBook', 'create_book', { input }],
  ['updateBook', 'update_book', { input }],
  ['deleteBook', 'delete_book', { bookId: 'book-1' }],
  ['listDocuments', 'list_documents', { bookId: 'book-1' }],
  ['getDocument', 'get_document', { documentId: 'document-1' }],
  ['createDocument', 'create_document', { input }],
  ['updateDocumentMetadata', 'update_document_metadata', { input }],
  ['saveDocument', 'save_document', { input }],
  ['deleteDocument', 'delete_document', { documentId: 'document-1' }],
  ['listVersions', 'list_versions', { documentId: 'document-1' }],
  ['getVersion', 'get_version', { documentId: 'document-1', versionId: 'version-1' }],
  ['createVersion', 'create_version', { input }],
  ['restoreVersion', 'restore_version', { input }],
] as const

describe('TauriPersistenceGateway', () => {
  beforeEach(() => {
    invoke.mockReset().mockResolvedValue({ ok: true })
  })

  it.each(cases)('maps %s to %s with Tauri v2 arguments', async (method, command, args) => {
    const gateway = new TauriPersistenceGateway()
    const values = args === undefined
      ? []
      : 'input' in args
        ? [input]
        : Object.values(args)

    const call = Reflect.get(gateway, method) as (...items: unknown[]) => Promise<unknown>
    await call.call(gateway, ...values)

    expect(invoke).toHaveBeenCalledOnce()
    expect(invoke).toHaveBeenCalledWith(command, args)
  })

  it('preserves structured persistence errors', async () => {
    const rejected = { code: 'databaseBusy', message: 'database is busy', retryable: true }

    expect(normalizePersistenceError(rejected)).toEqual(rejected)
  })

  it('normalizes unknown rejections to a non-retryable internal error', async () => {
    expect(normalizePersistenceError(new Error('invoke exploded'))).toEqual({
      code: 'internal',
      message: 'invoke exploded',
      retryable: false,
    })
  })

  it('rejects with the normalized error instead of the raw invoke rejection', async () => {
    invoke.mockRejectedValue({ code: 'conflict', message: 'revision conflict', retryable: false })

    await expect(new TauriPersistenceGateway().listBooks()).rejects.toEqual({
      code: 'conflict',
      message: 'revision conflict',
      retryable: false,
    })
  })
})
