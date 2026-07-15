import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersistenceGateway } from '../../persistence/gateway'
import { useAppStore } from '../app'
import {
  deferred, fakeGateway, sampleDocument, sampleVersion, versionSummary,
} from './fakeGateway'

function storeWith(gateway: PersistenceGateway) {
  setActivePinia(createPinia())
  const store = useAppStore()
  store.configurePersistence(gateway)
  return store
}

async function readyStore(gateway = fakeGateway()) {
  const store = storeWith(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  return { store, gateway }
}

describe('document-scoped persistence store', () => {
  beforeEach(() => vi.useRealTimers())

  it('routes books and document summaries through the configured gateway', async () => {
    const gateway = fakeGateway()
    const store = storeWith(gateway)
    await store.loadBooks()
    await store.selectBook('book-1')
    expect(gateway.listBooks).toHaveBeenCalledOnce()
    expect(gateway.getBook).toHaveBeenCalledWith('book-1')
    expect(gateway.listDocuments).toHaveBeenCalledWith('book-1')
    expect(store.currentBook?.id).toBe('book-1')
    expect(store.documents[0]).not.toHaveProperty('content')
  })

  it('clears old versions and detail cache before a new document load completes', async () => {
    const gateway = fakeGateway()
    const { store } = await readyStore(gateway)
    await store.loadVersionDetail('version-1')
    const pending = deferred<ReturnType<typeof sampleDocument>>()
    gateway.getDocument.mockImplementationOnce(() => pending.promise)
    void store.switchDocument('document-2')
    await Promise.resolve()
    expect(store.versions).toEqual([])
    expect(store.versionDetails).toEqual({})
    pending.resolve(sampleDocument('document-2'))
  })

  it('prevents a late A response from overwriting current B state', async () => {
    const gateway = fakeGateway()
    const store = storeWith(gateway)
    const a = deferred<ReturnType<typeof sampleDocument>>()
    const av = deferred<ReturnType<typeof versionSummary>[]>()
    gateway.getDocument.mockImplementation((id: string) =>
      id === 'A' ? a.promise : Promise.resolve(sampleDocument('B')))
    gateway.listVersions.mockImplementation((id: string) =>
      id === 'A' ? av.promise : Promise.resolve([versionSummary(sampleVersion('version-2', 'B'))]))
    const loadingA = store.switchDocument('A')
    await Promise.resolve()
    await store.switchDocument('B')
    a.resolve(sampleDocument('A'))
    av.resolve([versionSummary(sampleVersion('version-1', 'A'))])
    await loadingA
    expect(store.currentDocumentDetail?.id).toBe('B')
    expect(store.versions.map((version) => version.documentId)).toEqual(['B'])
  })

  it('loads version detail lazily once and keeps cache document-scoped', async () => {
    const { store, gateway } = await readyStore()
    expect(gateway.getVersion).not.toHaveBeenCalled()
    await store.loadVersionDetail('version-1')
    await store.loadVersionDetail('version-1')
    expect(gateway.getVersion).toHaveBeenCalledOnce()
    await store.switchDocument('document-2')
    expect(store.versionDetails).toEqual({})
  })

  it('loads selected Diff detail before opening Diff mode', async () => {
    const { store, gateway } = await readyStore()
    await store.selectVersionForDiff('version-1')
    expect(gateway.getVersion).toHaveBeenCalledWith('document-1', 'version-1')
    expect(store.selectedCommits).toEqual(['version-1'])
    expect(store.currentMode).toBe('diff')
    expect(store.getCommitDiff('version-1')?.content).toBe('version')
  })

  it('adapts VersionSummary to legacy Timeline CommitInfo without auto semantics', async () => {
    const { store } = await readyStore()
    expect(store.commits).toEqual([{
      id: 'version-1', timestamp: 2, message: 'Version version-1', isAutoCommit: false,
    }])
  })

  it('serializes saves and coalesces typing to the newest pending content', async () => {
    const gateway = fakeGateway()
    const first = deferred<ReturnType<typeof sampleDocument>>()
    gateway.saveDocument.mockImplementationOnce(() => first.promise)
    const { store } = await readyStore(gateway)
    store.queueDocumentSave('one')
    const flushing = store.flushDocumentSave()
    await vi.waitFor(() => expect(gateway.saveDocument).toHaveBeenCalledOnce())
    store.queueDocumentSave('two')
    store.queueDocumentSave('three')
    first.resolve(sampleDocument('document-1', 1, 'one'))
    await flushing
    expect(gateway.saveDocument.mock.calls).toHaveLength(2)
    expect(gateway.saveDocument.mock.calls[1][0]).toMatchObject({
      content: 'three', expectedRevision: 1,
    })
    expect(store.currentDocumentDetail?.revision).toBe(2)
  })

  it('surfaces revision conflict and never retries a stale overwrite', async () => {
    const gateway = fakeGateway()
    gateway.saveDocument.mockRejectedValue({
      code: 'conflict', message: 'revision conflict', retryable: false,
    })
    const { store } = await readyStore(gateway)
    store.queueDocumentSave('stale')
    await expect(store.flushDocumentSave()).rejects.toMatchObject({ code: 'conflict' })
    expect(gateway.saveDocument).toHaveBeenCalledOnce()
    expect(store.currentDocumentDetail?.content).toBe('initial')
    expect(store.error).toBe('revision conflict')
  })
})
