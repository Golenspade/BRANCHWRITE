import type { CreateBookInput, UpdateBookInput } from '../contracts'
import { fail, validateBook } from './errors'
import type { DemoState } from './state'
import { nextTimestamp } from './state'

export function listBooks(state: DemoState) {
  return Object.values(state.books)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs || a.id.localeCompare(b.id))
}

export function getBook(state: DemoState, id: string) {
  return state.books[id] ?? fail('notFound')
}

export function createBook(state: DemoState, input: CreateBookInput) {
  validateBook(input)
  const timestamp = Date.now()
  const book = {
    id: crypto.randomUUID(), ...input,
    createdAtMs: timestamp, updatedAtMs: timestamp,
  }
  state.books[book.id] = book
  return book
}

export function updateBook(state: DemoState, input: UpdateBookInput) {
  validateBook(input)
  const previous = getBook(state, input.id)
  const book = {
    ...input,
    createdAtMs: previous.createdAtMs,
    updatedAtMs: nextTimestamp(previous.updatedAtMs),
  }
  state.books[book.id] = book
  return book
}

export function deleteBook(state: DemoState, id: string) {
  getBook(state, id)
  delete state.books[id]
  const documentIds = Object.values(state.documents)
    .filter((document) => document.bookId === id).map((document) => document.id)
  for (const documentId of documentIds) delete state.documents[documentId]
  for (const version of Object.values(state.versions)) {
    if (documentIds.includes(version.documentId)) delete state.versions[version.id]
  }
}
