import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bookAndDocument, DEMO_KEY, operationId } from './demoTestSupport'

describe('DemoPersistenceGateway mutation serialization', () => {
  beforeEach(() => localStorage.removeItem(DEMO_KEY))

  it('prevents overlapping version mutations from committing stale drafts', async () => {
    const { gateway, document } = await bookAndDocument()
    const data = new TextEncoder().encode('first')
    const firstHash = await crypto.subtle.digest('SHA-256', data)
    let release!: (value: ArrayBuffer) => void
    const blocked = new Promise<ArrayBuffer>((resolve) => { release = resolve })
    const realDigest = crypto.subtle.digest.bind(crypto.subtle)
    const digest = vi.spyOn(crypto.subtle, 'digest')
      .mockImplementationOnce(() => blocked)
      .mockImplementation((algorithm, value) => realDigest(algorithm, value))

    try {
      const first = gateway.createVersion({
        operationId: operationId(20), documentId: document.id, content: 'first',
        message: 'First', expectedRevision: 0,
      })
      await vi.waitFor(() => expect(digest).toHaveBeenCalledTimes(1))
      const second = gateway.createVersion({
        operationId: operationId(21), documentId: document.id, content: 'second',
        message: 'Second', expectedRevision: 0,
      })
      release(firstHash)

      const [firstResult, secondResult] = await Promise.allSettled([first, second])
      expect(firstResult.status).toBe('fulfilled')
      expect(secondResult).toMatchObject({
        status: 'rejected', reason: { code: 'conflict' },
      })
      expect(await gateway.listVersions(document.id)).toHaveLength(1)
      expect((await gateway.getDocument(document.id)).content).toBe('first')
    } finally {
      digest.mockRestore()
    }
  })
})
