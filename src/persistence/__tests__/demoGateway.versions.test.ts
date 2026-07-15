import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bookAndDocument, DEMO_KEY, newDemo, operationId } from './demoTestSupport'

describe('DemoPersistenceGateway versions', () => {
  beforeEach(() => localStorage.removeItem(DEMO_KEY))

  it('allows explicit same-content manual versions with sequence and parent links', async () => {
    const { gateway, document } = await bookAndDocument('same')
    const first = await gateway.createVersion({
      operationId: operationId(1), documentId: document.id, content: 'same',
      message: 'First', expectedRevision: 0,
    })
    const second = await gateway.createVersion({
      operationId: operationId(2), documentId: document.id, content: 'same',
      message: 'Second', expectedRevision: 1,
    })
    expect([first.sequence, second.sequence]).toEqual([1, 2])
    expect(second.parentVersionId).toBe(first.id)
    expect((await gateway.getDocument(document.id)).revision).toBe(2)
  })

  it('lists summaries newest-first and loads full snapshots separately', async () => {
    const { gateway, document } = await bookAndDocument()
    const created = await gateway.createVersion({
      operationId: operationId(3), documentId: document.id, content: 'snapshot',
      message: 'Manual', expectedRevision: 0,
    })
    const [summary] = await gateway.listVersions(document.id)
    expect(summary).not.toHaveProperty('content')
    expect(await gateway.getVersion(document.id, created.id)).toEqual(created)
  })

  it('persists full immutable version snapshots across reopen', async () => {
    const { gateway, document } = await bookAndDocument()
    const created = await gateway.createVersion({
      operationId: operationId(4), documentId: document.id, content: 'persisted',
      message: 'Persist', expectedRevision: 0,
    })
    created.content = 'outside mutation'
    const reopened = await newDemo()
    expect((await reopened.getVersion(document.id, created.id)).content).toBe('persisted')
  })

  it('replays an identical create operation after revision advances', async () => {
    const { gateway, document } = await bookAndDocument()
    const input = {
      operationId: operationId(5), documentId: document.id, content: 'first',
      message: 'First', expectedRevision: 0,
    }
    const first = await gateway.createVersion(input)
    await gateway.createVersion({
      operationId: operationId(6), documentId: document.id, content: 'later',
      message: 'Later', expectedRevision: 1,
    })
    expect(await gateway.createVersion(input)).toEqual(first)
    expect(await gateway.listVersions(document.id)).toHaveLength(2)
  })

  it('conflicts when a create operation ID is reused with changed material', async () => {
    const { gateway, document } = await bookAndDocument()
    const input = {
      operationId: operationId(7), documentId: document.id, content: 'first',
      message: 'First', expectedRevision: 0,
    }
    await gateway.createVersion(input)
    await expect(gateway.createVersion({ ...input, content: 'changed' }))
      .rejects.toMatchObject({ code: 'conflict' })
  })

  it('isolates version queries and targets by document', async () => {
    const first = await bookAndDocument('first')
    const other = await first.gateway.createDocument({
      bookId: first.book.id, title: 'Other', sortOrder: 1,
      documentType: 'chapter', status: 'draft', content: 'other',
    })
    const version = await first.gateway.createVersion({
      operationId: operationId(8), documentId: first.document.id, content: 'private',
      message: 'Private', expectedRevision: 0,
    })
    await expect(first.gateway.getVersion(other.id, version.id))
      .rejects.toMatchObject({ code: 'notFound' })
  })

  it('restores through safety and restored snapshots with source links', async () => {
    const { gateway, document } = await bookAndDocument('initial')
    const target = await gateway.createVersion({
      operationId: operationId(9), documentId: document.id, content: 'target',
      message: 'Target', expectedRevision: 0,
    })
    await gateway.createVersion({
      operationId: operationId(10), documentId: document.id, content: 'current',
      message: 'Current', expectedRevision: 1,
    })
    const result = await gateway.restoreVersion({
      operationId: operationId(11), documentId: document.id,
      targetVersionId: target.id, expectedRevision: 2,
    })
    expect(result.alreadyCurrent).toBe(false)
    expect(result.safetyVersion).toMatchObject({ origin: 'restoreSafety', sequence: 3 })
    expect(result.restoredVersion).toMatchObject({
      origin: 'restore', sequence: 4, restoredFromVersionId: target.id,
      parentVersionId: result.safetyVersion?.id,
    })
    expect((await gateway.getDocument(document.id)).content).toBe('target')
  })

  it('replays identical restore operations without duplicate snapshots', async () => {
    const { gateway, document } = await bookAndDocument('initial')
    const target = await gateway.createVersion({
      operationId: operationId(12), documentId: document.id, content: 'target',
      message: 'Target', expectedRevision: 0,
    })
    await gateway.saveDocument({ documentId: document.id, content: 'changed', expectedRevision: 1 })
    const input = {
      operationId: operationId(13), documentId: document.id,
      targetVersionId: target.id, expectedRevision: 2,
    }
    const first = await gateway.restoreVersion(input)
    expect(await gateway.restoreVersion(input)).toEqual(first)
    expect(await gateway.listVersions(document.id)).toHaveLength(3)
  })

  it('does not claim an operation ID for an already-current restore', async () => {
    const { gateway, document } = await bookAndDocument()
    const target = await gateway.createVersion({
      operationId: operationId(14), documentId: document.id, content: 'current',
      message: 'Current', expectedRevision: 0,
    })
    const input = {
      operationId: operationId(15), documentId: document.id,
      targetVersionId: target.id, expectedRevision: 1,
    }
    expect(await gateway.restoreVersion(input)).toEqual({
      alreadyCurrent: true, safetyVersion: null, restoredVersion: null,
    })
    await gateway.saveDocument({ documentId: document.id, content: 'changed', expectedRevision: 1 })
    expect((await gateway.restoreVersion({ ...input, expectedRevision: 2 })).alreadyCurrent).toBe(false)
  })

  it('rejects stale restore without changing document or version list', async () => {
    const { gateway, document } = await bookAndDocument()
    const target = await gateway.createVersion({
      operationId: operationId(16), documentId: document.id, content: 'target',
      message: 'Target', expectedRevision: 0,
    })
    const beforeDocument = await gateway.getDocument(document.id)
    const beforeVersions = await gateway.listVersions(document.id)
    await expect(gateway.restoreVersion({
      operationId: operationId(17), documentId: document.id,
      targetVersionId: target.id, expectedRevision: 0,
    })).rejects.toMatchObject({ code: 'conflict' })
    expect(await gateway.getDocument(document.id)).toEqual(beforeDocument)
    expect(await gateway.listVersions(document.id)).toEqual(beforeVersions)
  })

  it('commits each compound version mutation as one aggregate write', async () => {
    const { gateway, document } = await bookAndDocument()
    const setItem = vi.spyOn(localStorage, 'setItem')
    const target = await gateway.createVersion({
      operationId: operationId(18), documentId: document.id, content: 'target',
      message: 'Target', expectedRevision: 0,
    })
    expect(setItem).toHaveBeenCalledTimes(1)
    await gateway.saveDocument({ documentId: document.id, content: 'changed', expectedRevision: 1 })
    setItem.mockClear()
    await gateway.restoreVersion({
      operationId: operationId(19), documentId: document.id,
      targetVersionId: target.id, expectedRevision: 2,
    })
    expect(setItem).toHaveBeenCalledTimes(1)
  })
})
