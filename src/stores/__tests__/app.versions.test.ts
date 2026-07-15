import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, type Mocked } from 'vitest'
import type { PersistenceGateway } from '../../persistence/gateway'
import { useAppStore } from '../app'
import { fakeGateway, sampleDocument, sampleVersion, versionSummary } from './fakeGateway'

async function ready(gateway: Mocked<PersistenceGateway>) {
  setActivePinia(createPinia())
  const store = useAppStore()
  store.configurePersistence(gateway)
  await store.selectBook('book-1')
  await store.switchDocument('document-1')
  return store
}

describe('atomic version actions', () => {
  it('drains autosave before createVersion and sends the returned revision', async () => {
    const gateway = fakeGateway()
    const order: string[] = []
    gateway.saveDocument.mockImplementation(async ({ content }) => {
      order.push('save')
      return sampleDocument('document-1', 1, content)
    })
    gateway.createVersion.mockImplementation(async () => {
      order.push('version')
      return sampleVersion()
    })
    const store = await ready(gateway)
    store.queueDocumentSave('draft')
    await store.createVersion('Manual')
    expect(order).toEqual(['save', 'version'])
    expect(gateway.createVersion.mock.calls[0][0]).toMatchObject({
      documentId: 'document-1', content: 'draft', message: 'Manual', expectedRevision: 1,
    })
    expect(gateway.createVersion.mock.calls[0][0].operationId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('prevents ghost versions when atomic create fails', async () => {
    const gateway = fakeGateway()
    gateway.createVersion.mockRejectedValue({
      code: 'storageUnavailable', message: 'create failed', retryable: false,
    })
    const store = await ready(gateway)
    const before = [...store.versions]
    await expect(store.createVersion('Fail')).rejects.toMatchObject({ code: 'storageUnavailable' })
    expect(store.versions).toEqual(before)
    expect(store.versionDetails).toEqual({})
    expect(store.error).toBe('create failed')
  })

  it('reloads document and versions only after create succeeds', async () => {
    const gateway = fakeGateway()
    const store = await ready(gateway)
    gateway.getDocument.mockResolvedValue(sampleDocument('document-1', 1, 'version content'))
    gateway.listVersions.mockResolvedValue([
      versionSummary(sampleVersion('version-2', 'document-1')),
    ])
    await store.createVersion('Success')
    expect(store.currentDocument).toBe('version content')
    expect(store.versions[0].id).toBe('version-2')
  })

  it('leaves document, versions, and selected UI unchanged on restore failure', async () => {
    const gateway = fakeGateway()
    const store = await ready(gateway)
    await store.loadVersionDetail('version-1')
    store.setSelectedCommits(['version-1'])
    const before = {
      document: store.currentDocumentDetail,
      versions: [...store.versions],
      details: { ...store.versionDetails },
      selected: [...store.selectedCommits],
    }
    gateway.restoreVersion.mockRejectedValue({
      code: 'conflict', message: 'restore conflict', retryable: false,
    })
    await expect(store.restoreVersion('version-1')).rejects.toMatchObject({ code: 'conflict' })
    expect(store.currentDocumentDetail).toEqual(before.document)
    expect(store.versions).toEqual(before.versions)
    expect(store.versionDetails).toEqual(before.details)
    expect(store.selectedCommits).toEqual(before.selected)
  })

  it('reports already-current restore as information without reloading state', async () => {
    const gateway = fakeGateway()
    const store = await ready(gateway)
    gateway.getDocument.mockClear()
    gateway.listVersions.mockClear()
    gateway.restoreVersion.mockResolvedValue({
      alreadyCurrent: true, safetyVersion: null, restoredVersion: null,
    })
    const result = await store.restoreVersion('version-1')
    expect(result.alreadyCurrent).toBe(true)
    expect(store.info).toBe('已经是此版本')
    expect(gateway.getDocument).not.toHaveBeenCalled()
    expect(gateway.listVersions).not.toHaveBeenCalled()
  })

  it('reloads document and versions after a successful restore', async () => {
    const gateway = fakeGateway()
    const store = await ready(gateway)
    gateway.getDocument.mockResolvedValue(sampleDocument('document-1', 2, 'restored'))
    gateway.listVersions.mockResolvedValue([
      versionSummary(sampleVersion('version-3', 'document-1')),
    ])
    await store.restoreVersion('version-1')
    expect(store.currentDocument).toBe('restored')
    expect(store.versions[0].id).toBe('version-3')
    expect(store.versionDetails).toEqual({})
  })
})
