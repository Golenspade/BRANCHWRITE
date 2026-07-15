import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookAndDocument, bookInput, DEMO_KEY, documentInput, newDemo } from './demoTestSupport'

const legacyKey = 'branchwrite_projects'

describe('DemoPersistenceGateway books and documents', () => {
  beforeEach(() => {
    localStorage.removeItem(DEMO_KEY)
    localStorage.removeItem(legacyKey)
  })

  afterEach(() => vi.restoreAllMocks())

  it('starts with an empty v2 namespace without writing it', async () => {
    const gateway = await newDemo()
    expect(await gateway.listBooks()).toEqual([])
    expect(localStorage.getItem(DEMO_KEY)).toBeNull()
  })

  it('reads only the aggregate v2 key and ignores legacy data', async () => {
    localStorage.setItem(legacyKey, JSON.stringify([{ id: 'legacy-book' }]))
    const getItem = vi.spyOn(localStorage, 'getItem')
    const gateway = await newDemo()
    expect(await gateway.listBooks()).toEqual([])
    expect(getItem).toHaveBeenCalledWith(DEMO_KEY)
    expect(getItem).not.toHaveBeenCalledWith(legacyKey)
  })

  it('does not replace corrupt v2 until an explicit mutation', async () => {
    localStorage.setItem(DEMO_KEY, '{broken')
    const setItem = vi.spyOn(localStorage, 'setItem')
    const gateway = await newDemo()
    expect(await gateway.listBooks()).toEqual([])
    expect(setItem).not.toHaveBeenCalled()
    await gateway.createBook(bookInput())
    expect(JSON.parse(localStorage.getItem(DEMO_KEY) || '').schemaVersion).toBe(2)
  })

  it('creates UUID books and reopens the aggregate state', async () => {
    const gateway = await newDemo()
    const created = await gateway.createBook(bookInput('Persistent'))
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.createdAtMs).toBe(created.updatedAtMs)
    await expect((await newDemo()).getBook(created.id)).resolves.toEqual(created)
  })

  it('updates books as full DTOs and sorts the latest update first', async () => {
    const gateway = await newDemo()
    const first = await gateway.createBook(bookInput('First'))
    const second = await gateway.createBook(bookInput('Second'))
    const updated = await gateway.updateBook({ ...bookInput('Renamed'), id: first.id })
    expect(updated.createdAtMs).toBe(first.createdAtMs)
    expect(updated.updatedAtMs).toBeGreaterThan(first.updatedAtMs)
    const expected = [updated, second]
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs || a.id.localeCompare(b.id))
      .map((book) => book.id)
    expect((await gateway.listBooks()).map((book) => book.id)).toEqual(expected)
  })

  it('creates document details and exposes content-free summaries in stable order', async () => {
    const gateway = await newDemo()
    const book = await gateway.createBook(bookInput())
    const last = await gateway.createDocument(documentInput(book.id, 'Last', 9))
    const first = await gateway.createDocument(documentInput(book.id, 'First', 2))
    const summaries = await gateway.listDocuments(book.id)
    expect(summaries.map((document) => document.id)).toEqual([first.id, last.id])
    expect(summaries[0]).not.toHaveProperty('content')
    expect(summaries[0]).not.toHaveProperty('contentHash')
  })

  it('matches Rust UTF-8 SHA-256 and Unicode word/character stats', async () => {
    const gateway = await newDemo()
    const book = await gateway.createBook(bookInput())
    const detail = await gateway.createDocument({
      ...documentInput(book.id), content: '你好 👋\nRust\t世界',
    })
    expect(detail.contentHash).toBe('fd6a9d36750ba11195d855b6b3e435e7cb4a9f7bb4b70d7e4278963f5d11a782')
    expect([detail.wordCount, detail.characterCount]).toEqual([4, 12])
  })

  it('checks revision before no-op and increments only changed saves', async () => {
    const { gateway, document } = await bookAndDocument()
    expect(await gateway.saveDocument({
      documentId: document.id, content: document.content, expectedRevision: 0,
    })).toEqual(document)
    await expect(gateway.saveDocument({
      documentId: document.id, content: document.content, expectedRevision: 1,
    })).rejects.toMatchObject({ code: 'conflict' })
    const changed = await gateway.saveDocument({
      documentId: document.id, content: 'changed', expectedRevision: 0,
    })
    expect(changed.revision).toBe(1)
  })

  it('checks metadata revisions and preserves content on metadata updates', async () => {
    const { gateway, document } = await bookAndDocument('body')
    const changed = await gateway.updateDocumentMetadata({
      documentId: document.id, title: 'Renamed', sortOrder: 3,
      documentType: 'section', status: 'review', expectedRevision: 0,
    })
    expect(changed).toMatchObject({ title: 'Renamed', revision: 1, content: 'body' })
    await expect(gateway.updateDocumentMetadata({
      documentId: document.id, title: 'Renamed', sortOrder: 3,
      documentType: 'section', status: 'review', expectedRevision: 0,
    })).rejects.toMatchObject({ code: 'conflict' })
  })

  it('returns immutable copies rather than mutable state references', async () => {
    const gateway = await newDemo()
    const created = await gateway.createBook(bookInput())
    created.name = 'mutated outside'
    expect((await gateway.getBook(created.id)).name).toBe('Book')
  })

  it('validates inputs and reports unknown records with Rust-shaped errors', async () => {
    const gateway = await newDemo()
    await expect(gateway.createBook({ ...bookInput(), name: '  ' }))
      .rejects.toMatchObject({ code: 'validation', retryable: false })
    await expect(gateway.getBook('missing')).rejects.toMatchObject({ code: 'notFound' })
    await expect(gateway.createDocument(documentInput('missing')))
      .rejects.toMatchObject({ code: 'notFound' })
  })

  it('deletes books with document cascade in one aggregate mutation', async () => {
    const { gateway, book, document } = await bookAndDocument()
    const setItem = vi.spyOn(localStorage, 'setItem')
    await gateway.deleteBook(book.id)
    expect(setItem).toHaveBeenCalledOnce()
    await expect(gateway.getDocument(document.id)).rejects.toMatchObject({ code: 'notFound' })
  })
})
