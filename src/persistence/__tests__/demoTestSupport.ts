import type { CreateBookInput, CreateDocumentInput } from '../contracts'
import { DemoPersistenceGateway } from '../demo/gateway'
import type { PersistenceGateway } from '../gateway'

export const DEMO_KEY = 'branchwrite_demo_v2'

export async function newDemo(): Promise<PersistenceGateway> {
  return new DemoPersistenceGateway()
}

export function bookInput(name = 'Book'): CreateBookInput {
  return {
    name,
    description: `${name} description`,
    author: 'Author',
    genre: 'novel',
    coverImage: null,
    tags: ['draft'],
    settings: { theme: 'light' },
  }
}

export function documentInput(bookId: string, title = 'Chapter', sortOrder = 0): CreateDocumentInput {
  return {
    bookId,
    title,
    sortOrder,
    documentType: 'chapter',
    status: 'draft',
    content: '',
  }
}

export async function bookAndDocument(content = 'initial') {
  const gateway = await newDemo()
  const book = await gateway.createBook(bookInput())
  const document = await gateway.createDocument({ ...documentInput(book.id), content })
  return { gateway, book, document }
}

export function operationId(seed: number) {
  return `00000000-0000-4000-8000-${seed.toString().padStart(12, '0')}`
}
