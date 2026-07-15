import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersistenceError } from '../../persistence/contracts'
import { useAppStore } from '../app'
import {
  deferred, fakeGateway, sampleDocument, sampleVersion, versionSummary,
} from './fakeGateway'

const saveFailure: PersistenceError = {
  code: 'internal', message: 'save failed', retryable: true,
}
const reloadFailure: PersistenceError = {
  code: 'internal', message: 'reload failed', retryable: true,
}

async function readyStore() {
  setActivePinia(createPinia())
  const gateway = fakeGateway()
  const store = useAppStore()
  store.configurePersistence(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  return { gateway, store }
}

describe('explicit save failure recovery', () => {
  beforeEach(() => vi.useRealTimers())

  it('preserves newer B after A fails, blocks navigation, then explicitly retries B', async () => {
    const { gateway, store } = await readyStore()
    const first = deferred<ReturnType<typeof sampleDocument>>()
    gateway.saveDocument.mockImplementationOnce(() => first.promise)
    store.queueDocumentSave('A')
    const saving = store.flushDocumentSave()
    await vi.waitFor(() => expect(gateway.saveDocument).toHaveBeenCalledOnce())
    store.queueDocumentSave('B')
    first.reject(saveFailure)

    await expect(saving).rejects.toEqual(saveFailure)
    expect(store.currentDocument).toBe('B')
    expect(store.saveState).toBe('error')
    await expect(store.switchDocument('document-2')).rejects.toEqual(saveFailure)
    expect(gateway.getDocument).not.toHaveBeenCalledWith('document-2')

    await store.retryDocumentSave()
    expect(gateway.saveDocument.mock.calls.map(([request]) => request.content)).toEqual(['A', 'B'])
    expect(gateway.saveDocument.mock.calls[1][0].expectedRevision).toBe(0)
    gateway.getDocument.mockResolvedValueOnce(sampleDocument('document-2'))
    gateway.listVersions.mockResolvedValueOnce([
      versionSummary(sampleVersion('version-2', 'document-2')),
    ])
    await store.switchDocument('document-2')
    expect(store.currentDocumentId).toBe('document-2')
  })

  it('retains a failed payload for top Save without automatically retrying', async () => {
    const { gateway, store } = await readyStore()
    gateway.saveDocument.mockRejectedValueOnce(saveFailure)
    store.queueDocumentSave('A')
    await expect(store.flushDocumentSave()).rejects.toEqual(saveFailure)
    await Promise.resolve()
    expect(gateway.saveDocument).toHaveBeenCalledOnce()

    await store.retryDocumentSave()
    expect(gateway.saveDocument.mock.calls.map(([request]) => request.content)).toEqual(['A', 'A'])
    expect(store.currentDocumentDetail?.content).toBe('A')
  })

  it('allows an explicit reload to discard the failed local draft', async () => {
    const { gateway, store } = await readyStore()
    gateway.saveDocument.mockRejectedValueOnce(saveFailure)
    store.queueDocumentSave('local draft')
    await expect(store.flushDocumentSave()).rejects.toEqual(saveFailure)
    gateway.getDocument.mockResolvedValueOnce(sampleDocument('document-1', 0, 'server copy'))

    await store.reloadDocumentDiscardingDraft()
    expect(store.currentDocument).toBe('server copy')
    expect(store.saveState).toBe('idle')
    expect(store.error).toBeNull()
  })

  it('keeps the failed draft retryable when explicit reload fails', async () => {
    const { gateway, store } = await readyStore()
    gateway.saveDocument.mockRejectedValueOnce(saveFailure)
    store.queueDocumentSave('local draft')
    await expect(store.flushDocumentSave()).rejects.toEqual(saveFailure)
    gateway.getDocument.mockRejectedValueOnce(reloadFailure)

    await expect(store.reloadDocumentDiscardingDraft()).rejects.toEqual(reloadFailure)
    expect(store.currentDocument).toBe('local draft')
    expect(store.saveState).toBe('error')
    expect(store.error).toBe('reload failed')
    await store.retryDocumentSave()
    expect(gateway.saveDocument.mock.calls.map(([request]) => request.content))
      .toEqual(['local draft', 'local draft'])
  })

  it('does not carry a failed document save across direct book selection', async () => {
    const { gateway, store } = await readyStore()
    gateway.saveDocument.mockRejectedValueOnce(saveFailure)
    store.queueDocumentSave('local draft')
    await expect(store.flushDocumentSave()).rejects.toEqual(saveFailure)

    await expect(store.selectBook('book-2')).rejects.toEqual(saveFailure)
    expect(gateway.getBook).not.toHaveBeenCalledWith('book-2')
    expect(store.currentDocumentId).toBe('document-1')
  })
})
