import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppState, CommitInfo, ProjectConfig, BookConfig, BookData, DocumentConfig } from '../types/index'
import { DocumentManager } from '../models/DocumentManager'
import { FileSystemService } from '../services/fileSystemService'

export const useAppStore = defineStore('app', () => {
  // 状态
  const currentDocument = ref('')
  const isHistoryPanelOpen = ref(false)
  const isDiffViewOpen = ref(false)
  const selectedCommits = ref<string[]>([])
  const currentMode = ref<'edit' | 'view'>('edit')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const commits = ref<CommitInfo[]>([])
  const commitData = ref<Record<string, string>>({})

  // 项目相关
  const projectConfig = ref<ProjectConfig | null>(null)
  const projectPath = ref<string | null>(null)

  // 书籍相关
  const currentBook = ref<BookData | null>(null)
  const books = ref<BookConfig[]>([])
  const showBookSelector = ref(true) // 默认显示书本选择器

  // 文档管理
  const currentDocumentConfig = ref<DocumentConfig | null>(null)
  const documents = ref<DocumentConfig[]>([])

  // DocumentManager
  const documentManager = ref<DocumentManager | null>(null)

  // 计算属性（如果需要的话）
  
  // Actions
  
  // 文档初始化
  const initializeDocument = (initialText: string = '', title: string = 'Untitled') => {
    currentDocument.value = initialText
    commits.value = []
  }

  // 文档操作
  const setCurrentDocument = (content: string) => {
    currentDocument.value = content
  }

  // 项目管理（简化版）
  const createProject = async (name: string, path: string) => {
    try {
      isLoading.value = true
      error.value = null
      console.log('Create project:', name, path)
      isLoading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create project'
      isLoading.value = false
    }
  }

  const loadProject = async (projectId: string) => {
    try {
      isLoading.value = true
      error.value = null
      console.log('Load project:', projectId)
      isLoading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load project'
      isLoading.value = false
    }
  }

  const saveProject = async () => {
    try {
      console.log('Save project')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save project'
    }
  }

  // 版本管理（简化版）
  const createCommit = (message: string) => {
    const id = Date.now().toString()
    const newCommit: CommitInfo = {
      id,
      timestamp: Date.now(),
      message,
      isAutoCommit: false,
    }
    commits.value = [newCommit, ...commits.value]
    // 保存当前文档快照
    commitData.value[id] = currentDocument.value
  }

  const checkoutCommit = (commitId: string) => {
    console.log('Checkout commit:', commitId)
  }

  const getCommitDiff = (commitId: string) => {
    const snap = commitData.value[commitId]
    if (snap == null) return null
    return { id: commitId, content: snap }
  }

  // 书本管理
  const loadBooks = async () => {
    console.log('🏪 Store: 开始加载书籍列表')
    try {
      isLoading.value = true
      error.value = null

      const booksList = await listBooks()
      console.log('🏪 Store: 获取到书籍列表', booksList.length, '本书')
      books.value = booksList
      console.log('🏪 Store: books.value 已更新', books.value.length)
      isLoading.value = false
    } catch (err) {
      console.error('🏪 Store: 加载书籍列表失败', err)
      error.value = err instanceof Error ? err.message : 'Failed to load books'
      isLoading.value = false
    }
  }

  const selectBook = async (bookId: string) => {
    try {
      await loadBook(bookId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to select book'
    }
  }

  const loadBook = async (bookId: string) => {
    console.log('📖 Store: 开始加载书籍', bookId)
    try {
      isLoading.value = true
      error.value = null

      const bookData = await FileSystemService.loadBook(bookId)
      console.log('📖 Store: 书籍数据加载成功', bookData)

      currentBook.value = bookData
      documents.value = bookData.documents
      currentDocumentConfig.value = bookData.documents[0] || null
      showBookSelector.value = false
      console.log('📖 Store: 文档列表已设置', documents.value.length, '个文档')
      isLoading.value = false
    } catch (err) {
      console.error('📖 Store: 加载书籍失败', err)
      error.value = err instanceof Error ? err.message : 'Failed to load book'
      isLoading.value = false
    }
  }

  const createBook = async (name: string, description: string, author: string, genre: string) => {
    try {
      const bookData = await FileSystemService.createBook(
        name,
        description,
        author,
        genre
      )

      // 更新本地书籍列表
      books.value = [bookData.config, ...books.value]

      return bookData.config.id
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create book'
      throw err
    }
  }

  const updateBook = async (bookId: string, config: Partial<BookConfig>) => {
    try {
      console.log('Update book:', bookId, config)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update book'
    }
  }

  const deleteBook = async (bookId: string) => {
    try {
      await FileSystemService.deleteBook(bookId)

      // 更新本地书籍列表
      books.value = books.value.filter(book => book.id !== bookId)

      // 如果删除的是当前书籍，清除当前书籍状态
      if (currentBook.value?.config.id === bookId) {
        currentBook.value = null
        documents.value = []
        currentDocumentConfig.value = null
        currentDocument.value = ''
        showBookSelector.value = true
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete book'
    }
  }

  const listBooks = async (): Promise<BookConfig[]> => {
    console.log('🏪 Store: 调用 FileSystemService.listBooks()')
    try {
      const result = await FileSystemService.listBooks()
      console.log('🏪 Store: FileSystemService 返回', result.length, '本书')
      return result
    } catch (err) {
      console.error('🏪 Store: listBooks 失败', err)
      error.value = err instanceof Error ? err.message : 'Failed to list books'
      return []
    }
  }

  // 文档管理
  const createDocument = async (bookId: string, title: string, docType: string) => {
    console.log('🏪 Store: 开始创建文档', { bookId, title, docType })
    try {
      const newDoc = await FileSystemService.createDocument(bookId, title, docType)
      console.log('🏪 Store: 文档创建成功', newDoc)

      // 更新文档列表
      documents.value = [...documents.value, newDoc]
      console.log('🏪 Store: 文档列表已更新', documents.value.length)

      return newDoc.id
    } catch (err) {
      console.error('🏪 Store: 创建文档失败', err)
      error.value = err instanceof Error ? err.message : 'Failed to create document'
      throw err
    }
  }

  const updateDocument = async (documentId: string, updates: Partial<DocumentConfig>) => {
    try {
      console.log('Update document:', documentId, updates)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update document'
    }
  }

  const deleteDocument = async (bookId: string, documentId: string) => {
    try {
      await FileSystemService.deleteDocument(bookId, documentId)

      // 从文档列表中移除
      documents.value = documents.value.filter(doc => doc.id !== documentId)

      // 如果删除的是当前文档，清空当前文档
      if (currentDocumentConfig.value?.id === documentId) {
        currentDocumentConfig.value = null
        currentDocument.value = ''
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete document'
    }
  }

  const switchDocument = async (documentId: string) => {
    try {
      console.log('Switch document:', documentId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to switch document'
    }
  }

  // 文档内容管理
  const loadDocuments = async (bookId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const docs = await FileSystemService.listDocuments(bookId)

      documents.value = docs
      isLoading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load documents'
      isLoading.value = false
    }
  }

  const loadDocumentContent = async (bookId: string, documentId: string) => {
    try {
      return await FileSystemService.loadDocument(bookId, documentId)
    } catch (err) {
      console.error('Failed to load document content:', err)
      throw err
    }
  }

  const saveDocumentContent = async (bookId: string, documentId: string, content: string) => {
    try {
      await FileSystemService.saveDocument(bookId, documentId, content)

      // 更新文档管理器
      if (documentManager.value) {
        documentManager.value.updateDocument(content)
      }
    } catch (err) {
      console.error('Failed to save document content:', err)
      throw err
    }
  }

  const selectDocument = (document: DocumentConfig) => {
    currentDocumentConfig.value = document
  }

  // DocumentManager 相关
  const initializeDocumentManager = (content: string, title: string) => {
    documentManager.value = new DocumentManager(content, title)
  }

  // 设置
  const updateSettings = (settings: Partial<any>) => {
    console.log('Update settings:', settings)
  }

  const setShowBookSelector = (show: boolean) => {
    showBookSelector.value = show
  }

  return {
    // 状态
    currentDocument,
    isHistoryPanelOpen,
    isDiffViewOpen,
    selectedCommits,
    currentMode,
    isLoading,
    error,
    commits,
    projectConfig,
    projectPath,
    currentBook,
    books,
    showBookSelector,
    currentDocumentConfig,
    documents,
    documentManager,

    // Actions
    initializeDocument,
    setCurrentDocument,
    createProject,
    loadProject,
    saveProject,
    createCommit,
    checkoutCommit,
    getCommitDiff,
    loadBooks,
    selectBook,
    loadBook,
    createBook,
    updateBook,
    deleteBook,
    listBooks,
    createDocument,
    updateDocument,
    deleteDocument,
    switchDocument,
    loadDocuments,
    loadDocumentContent,
    saveDocumentContent,
    selectDocument,
    initializeDocumentManager,
    updateSettings,
    setShowBookSelector
  }
})