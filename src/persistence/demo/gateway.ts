import type {
  CreateBookInput, CreateDocumentInput, CreateVersionInput, RestoreVersionInput,
  SaveDocumentInput, UpdateBookInput, UpdateDocumentMetadataInput,
} from '../contracts'
import type { PersistenceGateway } from '../gateway'
import * as books from './books'
import { createVersion as createVersionMutation } from './createVersion'
import * as documents from './documents'
import { fail } from './errors'
import { restoreVersion as restoreVersionMutation } from './restoreVersion'
import type { DemoMutation, DemoState } from './state'
import { changed, clone, commitState, loadState, summary, versionList } from './state'

export class DemoPersistenceGateway implements PersistenceGateway {
  private state: DemoState = loadState()
  private mutationTail: Promise<void> = Promise.resolve()

  private read<T>(value: T): T { return clone(value) }

  private mutate<T>(operation: (draft: DemoState) => DemoMutation<T> | Promise<DemoMutation<T>>) {
    const running = this.mutationTail.then(async () => {
      const draft = clone(this.state)
      const result = await operation(draft)
      if (result.changed) {
        commitState(draft)
        this.state = draft
      }
      return clone(result.value)
    })
    this.mutationTail = running.then(() => undefined, () => undefined)
    return running
  }

  async listBooks() { return this.read(books.listBooks(this.state)) }
  async getBook(bookId: string) { return this.read(books.getBook(this.state, bookId)) }
  createBook(input: CreateBookInput) {
    return this.mutate((state) => changed(books.createBook(state, input)))
  }
  updateBook(input: UpdateBookInput) {
    return this.mutate((state) => changed(books.updateBook(state, input)))
  }
  deleteBook(bookId: string) {
    return this.mutate((state) => { books.deleteBook(state, bookId); return changed(undefined) })
  }
  async listDocuments(bookId: string) {
    return this.read(documents.listDocuments(this.state, bookId))
  }
  async getDocument(documentId: string) {
    return this.read(documents.getDocument(this.state, documentId))
  }
  createDocument(input: CreateDocumentInput) {
    return this.mutate(async (state) => changed(await documents.createDocument(state, input)))
  }
  updateDocumentMetadata(input: UpdateDocumentMetadataInput) {
    return this.mutate((state) => documents.updateMetadata(state, input))
  }
  saveDocument(input: SaveDocumentInput) {
    return this.mutate((state) => documents.saveDocument(state, input))
  }
  deleteDocument(documentId: string) {
    return this.mutate((state) => {
      documents.deleteDocument(state, documentId)
      return changed(undefined)
    })
  }
  async listVersions(documentId: string) {
    documents.getDocument(this.state, documentId)
    return this.read(versionList(this.state, documentId).map(summary))
  }
  async getVersion(documentId: string, versionId: string) {
    const version = this.state.versions[versionId]
    if (!version || version.documentId !== documentId) fail('notFound')
    return this.read(version)
  }
  createVersion(input: CreateVersionInput) {
    return this.mutate((state) => createVersionMutation(state, input))
  }
  restoreVersion(input: RestoreVersionInput) {
    return this.mutate((state) => restoreVersionMutation(state, input))
  }
}
