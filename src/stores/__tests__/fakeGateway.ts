import { vi, type Mocked } from 'vitest'
import type {
  Book, DocumentDetail, DocumentSummary, VersionDetail, VersionSummary,
} from '../../persistence/contracts'
import type { PersistenceGateway } from '../../persistence/gateway'

export function sampleBook(id = 'book-1'): Book {
  return {
    id, name: `Book ${id}`, description: '', author: 'Author', genre: 'novel',
    coverImage: null, tags: [], settings: {}, createdAtMs: 1, updatedAtMs: 1,
  }
}

export function sampleDocument(id = 'document-1', revision = 0, content = 'initial'): DocumentDetail {
  return {
    id, bookId: 'book-1', title: `Document ${id}`, sortOrder: 0,
    documentType: 'chapter', status: 'draft', wordCount: content ? 1 : 0,
    characterCount: [...content].length, revision, versionSequence: 0,
    createdAtMs: 1, updatedAtMs: revision + 1, content, contentHash: `hash-${content}`,
  }
}

export function documentSummary(detail: DocumentDetail): DocumentSummary {
  const summary = { ...detail } as Partial<DocumentDetail>
  delete summary.content
  delete summary.contentHash
  return summary as DocumentSummary
}

export function sampleVersion(id = 'version-1', documentId = 'document-1'): VersionDetail {
  return {
    id, operationId: `00000000-0000-4000-8000-${id.replace(/\D/g, '').padStart(12, '0')}`,
    documentId, sequence: 1, parentVersionId: null, restoredFromVersionId: null,
    message: `Version ${id}`, origin: 'manual', contentHash: 'hash-version',
    wordCount: 1, characterCount: 7, createdAtMs: 2, content: 'version',
  }
}

export function versionSummary(detail: VersionDetail): VersionSummary {
  const summary = { ...detail } as Partial<VersionDetail>
  delete summary.content
  return summary as VersionSummary
}

export function fakeGateway(): Mocked<PersistenceGateway> {
  const book = sampleBook()
  const document = sampleDocument()
  const version = sampleVersion()
  return {
    listBooks: vi.fn(async () => [book]),
    getBook: vi.fn(async () => book),
    createBook: vi.fn(async () => book),
    updateBook: vi.fn(async () => book),
    deleteBook: vi.fn(async () => undefined),
    listDocuments: vi.fn(async () => [documentSummary(document)]),
    getDocument: vi.fn(async () => document),
    createDocument: vi.fn(async () => document),
    updateDocumentMetadata: vi.fn(async () => document),
    saveDocument: vi.fn(async ({ content, expectedRevision }) =>
      sampleDocument(document.id, expectedRevision + 1, content)),
    deleteDocument: vi.fn(async () => undefined),
    listVersions: vi.fn(async () => [versionSummary(version)]),
    getVersion: vi.fn(async () => version),
    createVersion: vi.fn(async () => version),
    restoreVersion: vi.fn(async () => ({
      alreadyCurrent: false, safetyVersion: null, restoredVersion: versionSummary(version),
    })),
  } as Mocked<PersistenceGateway>
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
