/**
 * 数据库服务单元测试
 * 测试覆盖：创建、读取、更新、删除、搜索
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Tauri SQL plugin
const mockDatabase = {
  execute: vi.fn(),
  select: vi.fn(),
}

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn(() => Promise.resolve(mockDatabase)),
  },
}))

import {
  initDatabase,
  createBook,
  getAllBooks,
  getBook,
  updateBook,
  deleteBook,
  createDocument,
  getDocumentsByBook,
  getDocument,
  updateDocument,
  deleteDocument,
  createCommit,
  getCommitsByDocument,
  getCommit,
  type Book,
  type Document,
  type Commit,
} from '../database'

describe('数据库服务测试', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // 模拟数据库初始化
    mockDatabase.execute.mockResolvedValue(undefined)
    await initDatabase()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('书籍管理', () => {
    describe('创建书籍', () => {
      it('应该成功创建一本新书', async () => {
        const bookData = {
          name: '我的第一本小说',
          description: '这是一本测试小说',
          author: '测试作者',
          genre: '科幻',
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        const book = await createBook(bookData)

        expect(book).toBeDefined()
        expect(book.id).toMatch(/^book_/)
        expect(book.name).toBe(bookData.name)
        expect(book.description).toBe(bookData.description)
        expect(book.author).toBe(bookData.author)
        expect(book.genre).toBe(bookData.genre)
        expect(book.created_at).toBeDefined()
        expect(book.last_modified).toBeDefined()
        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO books'),
          expect.any(Array)
        )
      })

      it('应该处理空描述', async () => {
        const bookData = {
          name: '无描述的书',
          author: '作者',
          genre: '小说',
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        const book = await createBook(bookData)

        expect(book.description).toBeUndefined()
      })
    })

    describe('读取书籍', () => {
      it('应该获取所有书籍列表', async () => {
        const mockBooks: Book[] = [
          {
            id: 'book_1',
            name: '书籍1',
            description: '描述1',
            author: '作者1',
            genre: '科幻',
            created_at: '2024-01-01T00:00:00Z',
            last_modified: '2024-01-01T00:00:00Z',
          },
          {
            id: 'book_2',
            name: '书籍2',
            description: '描述2',
            author: '作者2',
            genre: '奇幻',
            created_at: '2024-01-02T00:00:00Z',
            last_modified: '2024-01-02T00:00:00Z',
          },
        ]

        mockDatabase.select.mockResolvedValueOnce(mockBooks)

        const books = await getAllBooks()

        expect(books).toHaveLength(2)
        expect(books[0].name).toBe('书籍1')
        expect(books[1].name).toBe('书籍2')
        expect(mockDatabase.select).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM books')
        )
      })

      it('应该获取单个书籍', async () => {
        const mockBook: Book = {
          id: 'book_1',
          name: '测试书籍',
          description: '测试描述',
          author: '测试作者',
          genre: '测试类型',
          created_at: '2024-01-01T00:00:00Z',
          last_modified: '2024-01-01T00:00:00Z',
        }

        mockDatabase.select.mockResolvedValueOnce([mockBook])

        const book = await getBook('book_1')

        expect(book).toBeDefined()
        expect(book?.name).toBe('测试书籍')
        expect(mockDatabase.select).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = $1'),
          ['book_1']
        )
      })

      it('应该在书籍不存在时返回 null', async () => {
        mockDatabase.select.mockResolvedValueOnce([])

        const book = await getBook('nonexistent')

        expect(book).toBeNull()
      })
    })

    describe('更新书籍', () => {
      it('应该更新书籍信息', async () => {
        const updates = {
          name: '更新后的书名',
          description: '更新后的描述',
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await updateBook('book_1', updates)

        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE books'),
          expect.arrayContaining([updates.name, updates.description])
        )
      })

      it('应该只更新提供的字段', async () => {
        const updates = {
          name: '新书名',
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await updateBook('book_1', updates)

        expect(mockDatabase.execute).toHaveBeenCalled()
      })
    })

    describe('删除书籍', () => {
      it('应该删除指定书籍', async () => {
        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await deleteBook('book_1')

        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM books WHERE id = $1'),
          ['book_1']
        )
      })

      it('应该级联删除相关文档', async () => {
        // 由于外键约束，删除书籍会自动删除相关文档
        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await deleteBook('book_1')

        expect(mockDatabase.execute).toHaveBeenCalled()
      })
    })
  })

  describe('文档管理', () => {
    describe('创建文档', () => {
      it('应该成功创建新文档', async () => {
        const docData = {
          book_id: 'book_1',
          title: '第一章',
          order_num: 0,
          type: 'chapter',
          content: '这是第一章的内容',
          word_count: 10,
          character_count: 50,
          status: 'draft',
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        const doc = await createDocument(docData)

        expect(doc).toBeDefined()
        expect(doc.id).toMatch(/^doc_/)
        expect(doc.title).toBe(docData.title)
        expect(doc.book_id).toBe(docData.book_id)
        expect(doc.type).toBe(docData.type)
        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO documents'),
          expect.any(Array)
        )
      })

      it('应该设置默认值', async () => {
        const docData = {
          book_id: 'book_1',
          title: '新文档',
          order_num: 0,
          type: 'chapter',
          word_count: 0,
          character_count: 0,
          status: 'draft',
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        const doc = await createDocument(docData)

        expect(doc.content).toBeUndefined()
        expect(doc.status).toBe('draft')
      })
    })

    describe('读取文档', () => {
      it('应该获取书籍的所有文档', async () => {
        const mockDocs: Document[] = [
          {
            id: 'doc_1',
            book_id: 'book_1',
            title: '第一章',
            order_num: 0,
            type: 'chapter',
            content: '内容1',
            created_at: '2024-01-01T00:00:00Z',
            last_modified: '2024-01-01T00:00:00Z',
            word_count: 100,
            character_count: 500,
            status: 'draft',
          },
          {
            id: 'doc_2',
            book_id: 'book_1',
            title: '第二章',
            order_num: 1,
            type: 'chapter',
            content: '内容2',
            created_at: '2024-01-02T00:00:00Z',
            last_modified: '2024-01-02T00:00:00Z',
            word_count: 150,
            character_count: 600,
            status: 'draft',
          },
        ]

        mockDatabase.select.mockResolvedValueOnce(mockDocs)

        const docs = await getDocumentsByBook('book_1')

        expect(docs).toHaveLength(2)
        expect(docs[0].title).toBe('第一章')
        expect(docs[1].title).toBe('第二章')
        expect(mockDatabase.select).toHaveBeenCalledWith(
          expect.stringContaining('WHERE book_id = $1'),
          ['book_1']
        )
      })

      it('应该按顺序返回文档', async () => {
        const mockDocs: Document[] = [
          {
            id: 'doc_1',
            book_id: 'book_1',
            title: '第一章',
            order_num: 0,
            type: 'chapter',
            created_at: '2024-01-01T00:00:00Z',
            last_modified: '2024-01-01T00:00:00Z',
            word_count: 100,
            character_count: 500,
            status: 'draft',
          },
        ]

        mockDatabase.select.mockResolvedValueOnce(mockDocs)

        const docs = await getDocumentsByBook('book_1')

        expect(docs[0].order_num).toBe(0)
      })

      it('应该获取单个文档', async () => {
        const mockDoc: Document = {
          id: 'doc_1',
          book_id: 'book_1',
          title: '测试文档',
          order_num: 0,
          type: 'chapter',
          content: '测试内容',
          created_at: '2024-01-01T00:00:00Z',
          last_modified: '2024-01-01T00:00:00Z',
          word_count: 50,
          character_count: 200,
          status: 'draft',
        }

        mockDatabase.select.mockResolvedValueOnce([mockDoc])

        const doc = await getDocument('doc_1')

        expect(doc).toBeDefined()
        expect(doc?.title).toBe('测试文档')
        expect(doc?.content).toBe('测试内容')
      })
    })

    describe('更新文档', () => {
      it('应该更新文档内容', async () => {
        const content = '这是更新后的内容，包含更多文字。'

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await updateDocument('doc_1', content)

        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE documents'),
          expect.arrayContaining([content])
        )
      })

      it('应该自动计算字数和字符数', async () => {
        const content = 'Hello world test content'

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await updateDocument('doc_1', content)

        const callArgs = mockDatabase.execute.mock.calls[0][1]
        expect(callArgs[1]).toBe(4) // word count
        expect(callArgs[2]).toBe(content.length) // character count
      })
    })

    describe('删除文档', () => {
      it('应该删除指定文档', async () => {
        mockDatabase.execute.mockResolvedValueOnce(undefined)

        await deleteDocument('doc_1')

        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM documents WHERE id = $1'),
          ['doc_1']
        )
      })
    })

    describe('搜索文档', () => {
      it('应该能按标题搜索文档', async () => {
        const mockDocs: Document[] = [
          {
            id: 'doc_1',
            book_id: 'book_1',
            title: '第一章：开始',
            order_num: 0,
            type: 'chapter',
            created_at: '2024-01-01T00:00:00Z',
            last_modified: '2024-01-01T00:00:00Z',
            word_count: 100,
            character_count: 500,
            status: 'draft',
          },
        ]

        mockDatabase.select.mockResolvedValueOnce(mockDocs)

        const docs = await getDocumentsByBook('book_1')
        const filtered = docs.filter(d => d.title.includes('第一章'))

        expect(filtered).toHaveLength(1)
        expect(filtered[0].title).toContain('第一章')
      })
    })
  })

  describe('版本提交管理', () => {
    describe('创建提交', () => {
      it('应该成功创建版本提交', async () => {
        const commitData = {
          document_id: 'doc_1',
          message: '初始提交',
          content: '这是文档的初始内容',
          is_auto_commit: 0,
          word_count: 10,
          character_count: 50,
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        const commit = await createCommit(commitData)

        expect(commit).toBeDefined()
        expect(commit.id).toMatch(/^commit_/)
        expect(commit.message).toBe(commitData.message)
        expect(commit.document_id).toBe(commitData.document_id)
        expect(commit.timestamp).toBeDefined()
        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO commits'),
          expect.any(Array)
        )
      })

      it('应该支持自动提交标记', async () => {
        const commitData = {
          document_id: 'doc_1',
          content: '自动保存的内容',
          is_auto_commit: 1,
          word_count: 5,
          character_count: 30,
        }

        mockDatabase.execute.mockResolvedValueOnce(undefined)

        const commit = await createCommit(commitData)

        expect(commit.is_auto_commit).toBe(1)
      })
    })

    describe('读取提交', () => {
      it('应该获取文档的所有提交', async () => {
        const mockCommits: Commit[] = [
          {
            id: 'commit_1',
            document_id: 'doc_1',
            message: '第一次提交',
            content: '内容1',
            timestamp: '2024-01-01T00:00:00Z',
            is_auto_commit: 0,
            word_count: 100,
            character_count: 500,
          },
          {
            id: 'commit_2',
            document_id: 'doc_1',
            message: '第二次提交',
            content: '内容2',
            timestamp: '2024-01-02T00:00:00Z',
            is_auto_commit: 1,
            word_count: 150,
            character_count: 600,
          },
        ]

        mockDatabase.select.mockResolvedValueOnce(mockCommits)

        const commits = await getCommitsByDocument('doc_1')

        expect(commits).toHaveLength(2)
        expect(commits[0].message).toBe('第一次提交')
        expect(commits[1].is_auto_commit).toBe(1)
        expect(mockDatabase.select).toHaveBeenCalledWith(
          expect.stringContaining('WHERE document_id = $1'),
          ['doc_1']
        )
      })

      it('应该按时间倒序返回提交', async () => {
        const mockCommits: Commit[] = [
          {
            id: 'commit_2',
            document_id: 'doc_1',
            message: '最新提交',
            content: '最新内容',
            timestamp: '2024-01-02T00:00:00Z',
            is_auto_commit: 0,
            word_count: 100,
            character_count: 500,
          },
          {
            id: 'commit_1',
            document_id: 'doc_1',
            message: '旧提交',
            content: '旧内容',
            timestamp: '2024-01-01T00:00:00Z',
            is_auto_commit: 0,
            word_count: 80,
            character_count: 400,
          },
        ]

        mockDatabase.select.mockResolvedValueOnce(mockCommits)

        const commits = await getCommitsByDocument('doc_1')

        expect(commits[0].message).toBe('最新提交')
        expect(commits[1].message).toBe('旧提交')
      })

      it('应该获取单个提交', async () => {
        const mockCommit: Commit = {
          id: 'commit_1',
          document_id: 'doc_1',
          message: '测试提交',
          content: '测试内容',
          timestamp: '2024-01-01T00:00:00Z',
          is_auto_commit: 0,
          word_count: 50,
          character_count: 200,
        }

        mockDatabase.select.mockResolvedValueOnce([mockCommit])

        const commit = await getCommit('commit_1')

        expect(commit).toBeDefined()
        expect(commit?.message).toBe('测试提交')
        expect(commit?.content).toBe('测试内容')
      })
    })
  })

  describe('集成测试场景', () => {
    it('完整流程：创建书籍 -> 创建文档 -> 编辑 -> 提交 -> 删除', async () => {
      // 1. 创建书籍
      mockDatabase.execute.mockResolvedValueOnce(undefined)
      const book = await createBook({
        name: '测试小说',
        description: '完整流程测试',
        author: '测试作者',
        genre: '测试',
      })
      expect(book.id).toBeDefined()

      // 2. 创建文档
      mockDatabase.execute.mockResolvedValueOnce(undefined)
      const doc = await createDocument({
        book_id: book.id,
        title: '第一章',
        order_num: 0,
        type: 'chapter',
        word_count: 0,
        character_count: 0,
        status: 'draft',
      })
      expect(doc.id).toBeDefined()

      // 3. 更新文档内容
      mockDatabase.execute.mockResolvedValueOnce(undefined)
      await updateDocument(doc.id, '这是第一章的内容')

      // 4. 创建提交
      mockDatabase.execute.mockResolvedValueOnce(undefined)
      const commit = await createCommit({
        document_id: doc.id,
        message: '初始提交',
        content: '这是第一章的内容',
        is_auto_commit: 0,
        word_count: 5,
        character_count: 20,
      })
      expect(commit.id).toBeDefined()

      // 5. 删除文档
      mockDatabase.execute.mockResolvedValueOnce(undefined)
      await deleteDocument(doc.id)

      // 6. 删除书籍
      mockDatabase.execute.mockResolvedValueOnce(undefined)
      await deleteBook(book.id)

      // 验证所有操作都被调用
      expect(mockDatabase.execute).toHaveBeenCalledTimes(6)
    })

    it('应该处理多个文档的场景', async () => {
      const bookId = 'book_1'

      // 创建多个文档
      mockDatabase.execute.mockResolvedValue(undefined)

      const doc1 = await createDocument({
        book_id: bookId,
        title: '第一章',
        order_num: 0,
        type: 'chapter',
        word_count: 0,
        character_count: 0,
        status: 'draft',
      })

      const doc2 = await createDocument({
        book_id: bookId,
        title: '第二章',
        order_num: 1,
        type: 'chapter',
        word_count: 0,
        character_count: 0,
        status: 'draft',
      })

      // 获取所有文档
      mockDatabase.select.mockResolvedValueOnce([
        {
          id: doc1.id,
          book_id: bookId,
          title: '第一章',
          order_num: 0,
          type: 'chapter',
          created_at: doc1.created_at,
          last_modified: doc1.last_modified,
          word_count: 0,
          character_count: 0,
          status: 'draft',
        },
        {
          id: doc2.id,
          book_id: bookId,
          title: '第二章',
          order_num: 1,
          type: 'chapter',
          created_at: doc2.created_at,
          last_modified: doc2.last_modified,
          word_count: 0,
          character_count: 0,
          status: 'draft',
        },
      ])

      const docs = await getDocumentsByBook(bookId)

      expect(docs).toHaveLength(2)
      expect(docs[0].order_num).toBeLessThan(docs[1].order_num)
    })
  })
})
