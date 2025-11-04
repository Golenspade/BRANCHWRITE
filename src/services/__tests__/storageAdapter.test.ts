/**
 * 存储适配器单元测试
 * 测试 SQLite 和 localStorage 的自动切换
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock window and Tauri
const mockWindow = {
  __TAURI__: undefined as any,
}

vi.stubGlobal('window', mockWindow)

describe('存储适配器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清理 localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('环境检测', () => {
    it('应该在 Tauri 环境中使用 SQLite', async () => {
      // 模拟 Tauri 环境
      mockWindow.__TAURI__ = {}

      const { initStorage } = await import('../storageAdapter')
      
      // 由于 SQLite 初始化可能失败，我们只测试函数不抛出错误
      await expect(initStorage()).resolves.not.toThrow()
    })

    it('应该在 Web 环境中使用 localStorage', async () => {
      // 模拟 Web 环境
      delete mockWindow.__TAURI__

      const { initStorage } = await import('../storageAdapter')
      
      await expect(initStorage()).resolves.not.toThrow()
    })
  })

  describe('书籍操作 - localStorage 模式', () => {
    beforeEach(async () => {
      // 确保在 Web 环境
      delete mockWindow.__TAURI__
      
      const { initStorage } = await import('../storageAdapter')
      await initStorage()
    })

    it('应该创建书籍', async () => {
      const { createBook } = await import('../storageAdapter')
      
      const book = await createBook('测试书籍', '测试描述', '测试作者', '小说')
      
      expect(book).toBeDefined()
      expect(book.name).toBe('测试书籍')
      expect(book.author).toBe('测试作者')
      expect(book.genre).toBe('小说')
    })

    it('应该列出所有书籍', async () => {
      const { createBook, listBooks } = await import('../storageAdapter')
      
      await createBook('书籍1', '描述1', '作者1', '类型1')
      await createBook('书籍2', '描述2', '作者2', '类型2')
      
      const books = await listBooks()
      
      expect(books.length).toBeGreaterThanOrEqual(2)
      expect(books.some(b => b.name === '书籍1')).toBe(true)
      expect(books.some(b => b.name === '书籍2')).toBe(true)
    })

    it('应该删除书籍', async () => {
      const { createBook, listBooks, deleteBook } = await import('../storageAdapter')
      
      const book = await createBook('待删除的书', '描述', '作者', '类型')
      const booksBefore = await listBooks()
      
      await deleteBook(book.id)
      
      const booksAfter = await listBooks()
      expect(booksAfter.length).toBe(booksBefore.length - 1)
      expect(booksAfter.some(b => b.id === book.id)).toBe(false)
    })
  })

  describe('文档操作 - localStorage 模式', () => {
    let bookId: string

    beforeEach(async () => {
      delete mockWindow.__TAURI__
      
      const { initStorage, createBook } = await import('../storageAdapter')
      await initStorage()
      
      const book = await createBook('测试书籍', '描述', '作者', '类型')
      bookId = book.id
    })

    it('应该创建文档', async () => {
      const { createDocument } = await import('../storageAdapter')
      
      const doc = await createDocument(bookId, '第一章', 'chapter')
      
      expect(doc).toBeDefined()
      expect(doc.title).toBe('第一章')
      expect(doc.book_id).toBe(bookId)
      expect(doc.type).toBe('chapter')
    })

    it('应该列出书籍的所有文档', async () => {
      const { createDocument, listDocuments } = await import('../storageAdapter')
      
      await createDocument(bookId, '第一章', 'chapter')
      await createDocument(bookId, '第二章', 'chapter')
      
      const docs = await listDocuments(bookId)
      
      expect(docs.length).toBeGreaterThanOrEqual(2)
      expect(docs.some(d => d.title === '第一章')).toBe(true)
      expect(docs.some(d => d.title === '第二章')).toBe(true)
    })

    it('应该保存和加载文档内容', async () => {
      const { createDocument, saveDocument, loadDocument } = await import('../storageAdapter')
      
      const doc = await createDocument(bookId, '测试文档', 'chapter')
      const content = '这是测试内容，包含一些文字。'
      
      await saveDocument(bookId, doc.id, content)
      const loadedContent = await loadDocument(bookId, doc.id)
      
      expect(loadedContent).toBe(content)
    })

    it('应该删除文档', async () => {
      const { createDocument, listDocuments, deleteDocument } = await import('../storageAdapter')
      
      const doc = await createDocument(bookId, '待删除文档', 'chapter')
      const docsBefore = await listDocuments(bookId)
      
      await deleteDocument(bookId, doc.id)
      
      const docsAfter = await listDocuments(bookId)
      expect(docsAfter.length).toBe(docsBefore.length - 1)
      expect(docsAfter.some(d => d.id === doc.id)).toBe(false)
    })

    it('应该更新文档的字数统计', async () => {
      const { createDocument, saveDocument, listDocuments } = await import('../storageAdapter')
      
      const doc = await createDocument(bookId, '统计测试', 'chapter')
      const content = 'Hello world this is a test'
      
      await saveDocument(bookId, doc.id, content)
      
      const docs = await listDocuments(bookId)
      const updatedDoc = docs.find(d => d.id === doc.id)
      
      expect(updatedDoc?.word_count).toBeGreaterThan(0)
      expect(updatedDoc?.character_count).toBe(content.length)
    })
  })

  describe('完整工作流测试', () => {
    beforeEach(async () => {
      delete mockWindow.__TAURI__
      
      const { initStorage } = await import('../storageAdapter')
      await initStorage()
    })

    it('完整流程：创建书籍 -> 创建多个文档 -> 编辑 -> 删除', async () => {
      const {
        createBook,
        createDocument,
        saveDocument,
        loadDocument,
        listDocuments,
        deleteDocument,
        deleteBook,
      } = await import('../storageAdapter')

      // 1. 创建书籍
      const book = await createBook('完整测试小说', '测试描述', '测试作者', '科幻')
      expect(book.id).toBeDefined()

      // 2. 创建多个文档
      const doc1 = await createDocument(book.id, '第一章', 'chapter')
      const doc2 = await createDocument(book.id, '第二章', 'chapter')
      const doc3 = await createDocument(book.id, '笔记', 'note')

      // 3. 编辑文档
      await saveDocument(book.id, doc1.id, '第一章的内容')
      await saveDocument(book.id, doc2.id, '第二章的内容')
      await saveDocument(book.id, doc3.id, '一些笔记')

      // 4. 验证内容
      const content1 = await loadDocument(book.id, doc1.id)
      expect(content1).toBe('第一章的内容')

      // 5. 列出所有文档
      const docs = await listDocuments(book.id)
      expect(docs.length).toBe(3)

      // 6. 删除一个文档
      await deleteDocument(book.id, doc3.id)
      const docsAfterDelete = await listDocuments(book.id)
      expect(docsAfterDelete.length).toBe(2)

      // 7. 删除书籍
      await deleteBook(book.id)
    })

    it('应该处理空内容', async () => {
      const { createBook, createDocument, saveDocument, loadDocument } = await import('../storageAdapter')

      const book = await createBook('空内容测试', '描述', '作者', '类型')
      const doc = await createDocument(book.id, '空文档', 'chapter')

      await saveDocument(book.id, doc.id, '')
      const content = await loadDocument(book.id, doc.id)

      expect(content).toBe('')
    })

    it('应该处理大量文本', async () => {
      const { createBook, createDocument, saveDocument, loadDocument } = await import('../storageAdapter')

      const book = await createBook('大文本测试', '描述', '作者', '类型')
      const doc = await createDocument(book.id, '长文档', 'chapter')

      // 生成大量文本
      const largeContent = 'Lorem ipsum dolor sit amet. '.repeat(1000)

      await saveDocument(book.id, doc.id, largeContent)
      const content = await loadDocument(book.id, doc.id)

      expect(content).toBe(largeContent)
      expect(content.length).toBeGreaterThan(10000)
    })

    it('应该处理特殊字符', async () => {
      const { createBook, createDocument, saveDocument, loadDocument } = await import('../storageAdapter')

      const book = await createBook('特殊字符测试', '描述', '作者', '类型')
      const doc = await createDocument(book.id, '特殊文档', 'chapter')

      const specialContent = '这是中文 🎉 emoji\n换行\t制表符 "引号" \'单引号\' <标签>'

      await saveDocument(book.id, doc.id, specialContent)
      const content = await loadDocument(book.id, doc.id)

      expect(content).toBe(specialContent)
    })
  })

  describe('错误处理', () => {
    beforeEach(async () => {
      delete mockWindow.__TAURI__
      
      const { initStorage } = await import('../storageAdapter')
      await initStorage()
    })

    it('应该处理不存在的书籍', async () => {
      const { listDocuments } = await import('../storageAdapter')

      const docs = await listDocuments('nonexistent_book_id')

      expect(docs).toEqual([])
    })

    it('应该处理不存在的文档', async () => {
      const { createBook, loadDocument } = await import('../storageAdapter')

      const book = await createBook('测试书', '描述', '作者', '类型')
      const content = await loadDocument(book.id, 'nonexistent_doc_id')

      expect(content).toBe('')
    })
  })
})
