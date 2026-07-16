import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersistenceError, VersionDetail } from '../../persistence/contracts'
import { useAppStore } from '../app'
import {
  deferred, fakeGateway, sampleDocument, sampleVersion, versionSummary,
} from './fakeGateway'

async function pendingVersionRequest() {
  setActivePinia(createPinia())
  const gateway = fakeGateway()
  const store = useAppStore()
  store.configurePersistence(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  const pending = deferred<VersionDetail>()
  gateway.getVersion.mockImplementationOnce(() => pending.promise)
  return { gateway, store, pending }
}

async function switchToDocumentB(
  store: ReturnType<typeof useAppStore>,
  gateway: ReturnType<typeof fakeGateway>,
) {
  gateway.getDocument.mockResolvedValueOnce(sampleDocument('document-2'))
  gateway.listVersions.mockResolvedValueOnce([
    versionSummary(sampleVersion('version-2', 'document-2')),
  ])
  await store.switchDocument('document-2')
}

const lateFailure: PersistenceError = {
  code: 'internal', message: 'late A failure', retryable: false,
}

describe('late document-scoped version detail', () => {
  beforeEach(() => vi.useRealTimers())

  it('returns no applicable View detail after a late A success', async () => {
    const { gateway, store, pending } = await pendingVersionRequest()
    const loading = store.loadVersionDetail('version-1')
    await vi.waitFor(() => expect(gateway.getVersion).toHaveBeenCalledOnce())
    await switchToDocumentB(store, gateway)
    pending.resolve(sampleVersion('version-1', 'document-1'))

    await expect(loading).resolves.toBeNull()
    expect(store.versionDetails).toEqual({})
    expect(store.error).toBeNull()
  })

  it('silences a late A View failure after switching to B', async () => {
    const { gateway, store, pending } = await pendingVersionRequest()
    const loading = store.loadVersionDetail('version-1')
    await vi.waitFor(() => expect(gateway.getVersion).toHaveBeenCalledOnce())
    await switchToDocumentB(store, gateway)
    pending.reject(lateFailure)

    await expect(loading).resolves.toBeNull()
    expect(store.versionDetails).toEqual({})
    expect(store.error).toBeNull()
  })

  it('does not select or open Diff after a late A success', async () => {
    const { gateway, store, pending } = await pendingVersionRequest()
    const opening = store.selectVersionForDiff('version-1')
    await vi.waitFor(() => expect(gateway.getVersion).toHaveBeenCalledOnce())
    await switchToDocumentB(store, gateway)
    pending.resolve(sampleVersion('version-1', 'document-1'))

    await expect(opening).resolves.toBe(false)
    expect(store.selectedCommits).toEqual([])
    expect(store.currentMode).toBe('wysiwyg')
    expect(store.error).toBeNull()
  })

  it('silences a late A Diff failure without changing B UI state', async () => {
    const { gateway, store, pending } = await pendingVersionRequest()
    const opening = store.selectVersionForDiff('version-1')
    await vi.waitFor(() => expect(gateway.getVersion).toHaveBeenCalledOnce())
    await switchToDocumentB(store, gateway)
    pending.reject(lateFailure)

    await expect(opening).resolves.toBe(false)
    expect(store.selectedCommits).toEqual([])
    expect(store.currentMode).toBe('wysiwyg')
    expect(store.error).toBeNull()
  })

  it('leaves Diff mode immediately when switching away from the displayed document', async () => {
    const { gateway, store } = await pendingVersionRequest()
    gateway.getVersion.mockReset()
    gateway.getVersion.mockResolvedValueOnce(sampleVersion('version-1', 'document-1'))
    await store.selectVersionForDiff('version-1')
    expect(store.currentMode).toBe('diff')
    expect(store.selectedCommits).toEqual(['version-1'])
    expect(store.versionDetails).toHaveProperty('version-1')

    const documentB = deferred<ReturnType<typeof sampleDocument>>()
    const versionsB = deferred<ReturnType<typeof versionSummary>[]>()
    gateway.getDocument.mockImplementationOnce(() => documentB.promise)
    gateway.listVersions.mockImplementationOnce(() => versionsB.promise)
    const switching = store.switchDocument('document-2')
    await vi.waitFor(() => expect(gateway.getDocument).toHaveBeenCalledWith('document-2'))

    expect(store.currentMode).toBe('wysiwyg')
    expect(store.selectedCommits).toEqual([])
    expect(store.versionDetails).toEqual({})
    expect(store.versions).toEqual([])

    documentB.resolve(sampleDocument('document-2'))
    versionsB.resolve([versionSummary(sampleVersion('version-2', 'document-2'))])
    await switching
    expect(store.currentMode).toBe('wysiwyg')
    expect(store.selectedCommits).toEqual([])
    expect(store.versionDetails).toEqual({})
    expect(store.versions.map((version) => version.documentId)).toEqual(['document-2'])
  })
})
