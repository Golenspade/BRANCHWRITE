import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { CommitInfo } from '../types/index'
import type {
  Book, DocumentDetail, DocumentSummary, RestoreVersionResult,
  VersionDetail, VersionSummary,
} from '../persistence/contracts'
import type { PersistenceGateway } from '../persistence/gateway'

type EditorMode = 'wysiwyg' | 'source' | 'preview' | 'diff' | 'edit'
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
type SaveRequest = { documentId: string; content: string }

function toDocumentSummary(detail: DocumentDetail): DocumentSummary {
  const summary = { ...detail } as Partial<DocumentDetail>
  delete summary.content
  delete summary.contentHash
  return summary as DocumentSummary
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return error instanceof Error ? error.message : String(error)
}

export const useAppStore = defineStore('app', () => {
  let gateway: PersistenceGateway | null = null
  let requestGeneration = 0
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingSave: SaveRequest | null = null
  let failedSave: SaveRequest | null = null
  let saveFailure: unknown = null
  let saveLoop: Promise<void> | null = null

  const books = shallowRef<Book[]>([])
  const currentBook = shallowRef<Book | null>(null)
  const documents = ref<DocumentSummary[]>([])
  const currentDocumentId = ref<string | null>(null)
  const currentDocumentDetail = ref<DocumentDetail | null>(null)
  const currentDocument = ref('')
  const versions = ref<VersionSummary[]>([])
  const versionDetails = ref<Record<string, VersionDetail>>({})
  const selectedCommits = ref<string[]>([])
  const currentMode = ref<EditorMode>('wysiwyg')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const info = ref<string | null>(null)
  const saveState = ref<SaveState>('idle')
  const showBookSelector = ref(true)
  const isHistoryPanelOpen = ref(false)
  const isDiffViewOpen = ref(false)

  const currentDocumentConfig = computed(() => currentDocumentDetail.value)
  const commits = computed<CommitInfo[]>(() => versions.value.map((version) => ({
    id: version.id,
    timestamp: version.createdAtMs,
    message: version.message,
    isAutoCommit: false,
  })))
  const commitData = computed(() => Object.fromEntries(
    Object.entries(versionDetails.value).map(([id, detail]) => [id, detail.content]),
  ))

  function requireGateway() {
    if (!gateway) throw new Error('Persistence is not configured')
    return gateway
  }

  function configurePersistence(value: PersistenceGateway) { gateway = value }
  function setCurrentMode(mode: EditorMode) {
    currentMode.value = mode === 'edit' ? 'wysiwyg' : mode
  }
  function setSelectedCommits(ids: string[]) { selectedCommits.value = ids }
  function setCurrentDocument(content: string) { currentDocument.value = content }
  function initializeDocument(content = '') { currentDocument.value = content }

  function updateSummary(detail: DocumentDetail) {
    const summary = toDocumentSummary(detail)
    const index = documents.value.findIndex((item) => item.id === detail.id)
    if (index >= 0) documents.value[index] = summary
    else documents.value.push(summary)
  }

  function applyLoadedDocument(detail: DocumentDetail, loadedVersions: VersionSummary[]) {
    currentDocumentDetail.value = detail
    currentDocument.value = detail.content
    versions.value = loadedVersions
    versionDetails.value = {}
    selectedCommits.value = []
    updateSummary(detail)
  }

  async function loadBooks() {
    isLoading.value = true
    error.value = null
    try { books.value = await requireGateway().listBooks() }
    catch (failure) { error.value = errorMessage(failure); throw failure }
    finally { isLoading.value = false }
  }

  async function selectBook(bookId: string) {
    if (currentDocumentId.value) await flushDocumentSave()
    isLoading.value = true
    error.value = null
    try {
      const [book, summaries] = await Promise.all([
        requireGateway().getBook(bookId), requireGateway().listDocuments(bookId),
      ])
      currentBook.value = book
      documents.value = summaries
      clearDocumentState(null)
      showBookSelector.value = false
    } catch (failure) { error.value = errorMessage(failure); throw failure }
    finally { isLoading.value = false }
  }

  async function createBook(name: string, description: string, author: string, genre: string) {
    try {
      const created = await requireGateway().createBook({
        name, description, author, genre, coverImage: null, tags: [], settings: {},
      })
      books.value = [created, ...books.value]
      return created.id
    } catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  async function deleteBook(bookId: string) {
    try {
      await requireGateway().deleteBook(bookId)
      books.value = books.value.filter((book) => book.id !== bookId)
      if (currentBook.value?.id === bookId) {
        currentBook.value = null
        documents.value = []
        clearDocumentState(null)
        showBookSelector.value = true
      }
    } catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  async function loadDocuments(bookId: string) {
    try { documents.value = await requireGateway().listDocuments(bookId) }
    catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  async function createDocument(bookId: string, title: string, documentType: string) {
    try {
      const created = await requireGateway().createDocument({
        bookId, title, sortOrder: documents.value.length,
        documentType, status: 'draft', content: '',
      })
      updateSummary(created)
      return created.id
    } catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  async function deleteDocument(bookOrDocumentId: string, maybeDocumentId?: string) {
    const documentId = maybeDocumentId ?? bookOrDocumentId
    try {
      await flushDocumentSave()
      await requireGateway().deleteDocument(documentId)
      documents.value = documents.value.filter((document) => document.id !== documentId)
      if (currentDocumentId.value === documentId) clearDocumentState(null)
    } catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  function clearDocumentState(target: string | null) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    pendingSave = null
    failedSave = null
    saveFailure = null
    saveState.value = 'idle'
    currentDocumentId.value = target
    currentDocumentDetail.value = null
    currentDocument.value = ''
    versions.value = []
    versionDetails.value = {}
    selectedCommits.value = []
  }

  async function switchDocument(documentId: string) {
    await flushDocumentSave()
    const generation = ++requestGeneration
    clearDocumentState(documentId)
    try {
      const [detail, summaries] = await Promise.all([
        requireGateway().getDocument(documentId), requireGateway().listVersions(documentId),
      ])
      if (generation === requestGeneration && currentDocumentId.value === documentId) {
        applyLoadedDocument(detail, summaries)
      }
    } catch (failure) {
      if (generation === requestGeneration && currentDocumentId.value === documentId) {
        error.value = errorMessage(failure)
      }
      throw failure
    }
  }

  async function reloadCurrentDocument(documentId: string, generation: number) {
    const [detail, summaries] = await Promise.all([
      requireGateway().getDocument(documentId), requireGateway().listVersions(documentId),
    ])
    if (generation === requestGeneration && currentDocumentId.value === documentId) {
      applyLoadedDocument(detail, summaries)
    }
  }

  function queueDocumentSave(content: string) {
    const detail = currentDocumentDetail.value
    if (!detail) return
    currentDocument.value = content
    const request = { documentId: detail.id, content }
    if (failedSave?.documentId === detail.id) {
      failedSave = request
      saveState.value = 'error'
      return
    }
    pendingSave = request
    saveState.value = 'pending'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void flushDocumentSave().catch(() => undefined) }, 1200)
  }

  async function processSaveQueue() {
    while (pendingSave) {
      const request = pendingSave
      pendingSave = null
      const detail = currentDocumentDetail.value
      if (!detail || detail.id !== request.documentId) continue
      saveState.value = 'saving'
      let saved: DocumentDetail
      try {
        saved = await requireGateway().saveDocument({
          documentId: request.documentId,
          content: request.content,
          expectedRevision: detail.revision,
        })
      } catch (failure) {
        failedSave = pendingSave?.documentId === request.documentId ? pendingSave : request
        pendingSave = null
        saveFailure = failure
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = null
        saveState.value = 'error'
        error.value = errorMessage(failure)
        throw failure
      }
      if (currentDocumentId.value === saved.id) {
        currentDocumentDetail.value = saved
        updateSummary(saved)
      }
      saveState.value = pendingSave ? 'pending' : 'saved'
    }
  }

  function startSaveLoop() {
    if (!saveLoop) {
      const running = processSaveQueue()
        .finally(() => { if (saveLoop === running) saveLoop = null })
      saveLoop = running
    }
    return saveLoop
  }

  async function flushDocumentSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    if (failedSave) throw saveFailure
    while (pendingSave || saveLoop) await (saveLoop ?? startSaveLoop())
    if (failedSave) throw saveFailure
  }

  async function retryDocumentSave() {
    if (!failedSave) return flushDocumentSave()
    pendingSave = failedSave
    failedSave = null
    saveFailure = null
    error.value = null
    saveState.value = 'pending'
    await flushDocumentSave()
  }

  async function reloadDocumentDiscardingDraft() {
    const documentId = currentDocumentId.value
    if (!documentId) return
    const generation = ++requestGeneration
    try {
      await reloadCurrentDocument(documentId, generation)
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = null
      pendingSave = null
      failedSave = null
      saveFailure = null
      error.value = null
      saveState.value = 'idle'
    } catch (failure) {
      error.value = errorMessage(failure)
      saveState.value = 'error'
      throw failure
    }
  }

  async function loadVersionDetail(versionId: string) {
    const cached = versionDetails.value[versionId]
    if (cached) return cached
    const documentId = currentDocumentId.value
    const generation = requestGeneration
    if (!documentId) throw new Error('No document selected')
    try {
      const detail = await requireGateway().getVersion(documentId, versionId)
      if (generation !== requestGeneration || currentDocumentId.value !== documentId) return null
      versionDetails.value = { ...versionDetails.value, [versionId]: detail }
      return detail
    } catch (failure) {
      if (generation !== requestGeneration || currentDocumentId.value !== documentId) return null
      error.value = errorMessage(failure)
      throw failure
    }
  }

  async function selectVersionForDiff(versionId: string) {
    const detail = await loadVersionDetail(versionId)
    if (!detail) return false
    selectedCommits.value = [versionId]
    currentMode.value = 'diff'
    return true
  }

  function getCommitDiff(versionId: string) {
    const detail = versionDetails.value[versionId]
    return detail ? { id: versionId, content: detail.content } : null
  }

  async function createVersion(message: string) {
    await flushDocumentSave()
    const detail = currentDocumentDetail.value
    if (!detail) throw new Error('No document selected')
    const generation = requestGeneration
    error.value = null
    try {
      const created = await requireGateway().createVersion({
        operationId: crypto.randomUUID(), documentId: detail.id,
        content: currentDocument.value, message, expectedRevision: detail.revision,
      })
      await reloadCurrentDocument(detail.id, generation)
      return created
    } catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  async function restoreVersion(versionId: string): Promise<RestoreVersionResult> {
    await flushDocumentSave()
    const detail = currentDocumentDetail.value
    if (!detail) throw new Error('No document selected')
    const generation = requestGeneration
    error.value = null
    info.value = null
    try {
      const result = await requireGateway().restoreVersion({
        operationId: crypto.randomUUID(), documentId: detail.id,
        targetVersionId: versionId, expectedRevision: detail.revision,
      })
      if (result.alreadyCurrent) info.value = '已经是此版本'
      else await reloadCurrentDocument(detail.id, generation)
      return result
    } catch (failure) { error.value = errorMessage(failure); throw failure }
  }

  async function loadDocumentContent(_bookId: string, documentId: string) {
    return (await requireGateway().getDocument(documentId)).content
  }
  async function saveDocumentContent(_bookId: string, documentId: string, content: string) {
    if (currentDocumentId.value !== documentId) await switchDocument(documentId)
    queueDocumentSave(content)
    await flushDocumentSave()
  }
  function selectDocument(document: DocumentSummary) { return switchDocument(document.id) }
  function setShowBookSelector(show: boolean) { showBookSelector.value = show }

  return {
    books, currentBook, documents, currentDocumentId, currentDocumentDetail,
    currentDocumentConfig, currentDocument, versions, versionDetails, commits, commitData,
    selectedCommits, currentMode, isLoading, error, info, saveState, showBookSelector,
    isHistoryPanelOpen, isDiffViewOpen,
    configurePersistence, initializeDocument, setCurrentDocument, setCurrentMode,
    setSelectedCommits, loadBooks, selectBook, loadBook: selectBook, createBook,
    deleteBook, loadDocuments, createDocument, deleteDocument, switchDocument,
    selectDocument, queueDocumentSave, flushDocumentSave, loadVersionDetail,
    retryDocumentSave, reloadDocumentDiscardingDraft,
    selectVersionForDiff, getCommitDiff, createVersion, restoreVersion,
    loadDocumentContent, saveDocumentContent, setShowBookSelector,
  }
})
