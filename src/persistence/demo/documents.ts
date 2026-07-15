import type {
  CreateDocumentInput, DocumentDetail, DocumentSummary, SaveDocumentInput,
  UpdateDocumentMetadataInput,
} from '../contracts'
import { fail, validateDocument, validateRevision } from './errors'
import { contentMetadata } from './metadata'
import type { DemoState } from './state'
import { changed, nextTimestamp, unchanged } from './state'

export function listDocuments(state: DemoState, bookId: string) {
  return Object.values(state.documents)
    .filter((document) => document.bookId === bookId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map(toSummary)
}

function toSummary(detail: DocumentDetail): DocumentSummary {
  const result = { ...detail } as Partial<DocumentDetail>
  delete result.content
  delete result.contentHash
  return result as DocumentSummary
}

export function getDocument(state: DemoState, id: string) {
  return state.documents[id] ?? fail('notFound')
}

export async function createDocument(state: DemoState, input: CreateDocumentInput) {
  validateDocument(input)
  if (!state.books[input.bookId]) fail('notFound')
  const metadata = await contentMetadata(input.content)
  const timestamp = Date.now()
  const detail = {
    id: crypto.randomUUID(), ...input, ...metadata,
    revision: 0, versionSequence: 0,
    createdAtMs: timestamp, updatedAtMs: timestamp,
  }
  state.documents[detail.id] = detail
  return detail
}

export function updateMetadata(state: DemoState, input: UpdateDocumentMetadataInput) {
  validateRevision(input.expectedRevision)
  validateDocument(input)
  const current = getDocument(state, input.documentId)
  if (current.revision !== input.expectedRevision) fail('conflict')
  if (current.title === input.title && current.sortOrder === input.sortOrder
    && current.documentType === input.documentType && current.status === input.status) {
    return unchanged(current)
  }
  const detail = {
    ...current,
    title: input.title, sortOrder: input.sortOrder,
    documentType: input.documentType, status: input.status,
    revision: current.revision + 1,
    updatedAtMs: nextTimestamp(current.updatedAtMs),
  }
  state.documents[detail.id] = detail
  return changed(detail)
}

export async function saveDocument(state: DemoState, input: SaveDocumentInput) {
  validateRevision(input.expectedRevision)
  const current = getDocument(state, input.documentId)
  if (current.revision !== input.expectedRevision) fail('conflict')
  if (current.content === input.content) return unchanged(current)
  const detail = {
    ...current, ...await contentMetadata(input.content), content: input.content,
    revision: current.revision + 1,
    updatedAtMs: nextTimestamp(current.updatedAtMs),
  }
  state.documents[detail.id] = detail
  return changed(detail)
}

export function deleteDocument(state: DemoState, id: string) {
  getDocument(state, id)
  delete state.documents[id]
  for (const version of Object.values(state.versions)) {
    if (version.documentId === id) delete state.versions[version.id]
  }
}
