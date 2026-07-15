import type {
  Book, CreateBookInput, CreateDocumentInput, CreateVersionInput, DocumentDetail,
  DocumentSummary, RestoreVersionInput, RestoreVersionResult, SaveDocumentInput,
  UpdateBookInput, UpdateDocumentMetadataInput, VersionDetail, VersionSummary,
} from './contracts'

export interface PersistenceGateway {
  listBooks(): Promise<Book[]>
  getBook(bookId: string): Promise<Book>
  createBook(input: CreateBookInput): Promise<Book>
  updateBook(input: UpdateBookInput): Promise<Book>
  deleteBook(bookId: string): Promise<void>
  listDocuments(bookId: string): Promise<DocumentSummary[]>
  getDocument(documentId: string): Promise<DocumentDetail>
  createDocument(input: CreateDocumentInput): Promise<DocumentDetail>
  updateDocumentMetadata(input: UpdateDocumentMetadataInput): Promise<DocumentDetail>
  saveDocument(input: SaveDocumentInput): Promise<DocumentDetail>
  deleteDocument(documentId: string): Promise<void>
  listVersions(documentId: string): Promise<VersionSummary[]>
  getVersion(documentId: string, versionId: string): Promise<VersionDetail>
  createVersion(input: CreateVersionInput): Promise<VersionDetail>
  restoreVersion(input: RestoreVersionInput): Promise<RestoreVersionResult>
}
