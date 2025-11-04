/**
 * SQLite 数据库服务
 */

import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
  if (db) return

  try {
    // 创建或打开数据库
    db = await Database.load('sqlite:branchwrite.db')

    // 创建表结构
    await createTables()
    
    console.log('✅ 数据库初始化成功')
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

/**
 * 创建数据库表
 */
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized')

  // 书籍表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      author TEXT,
      genre TEXT,
      cover_image TEXT,
      created_at TEXT NOT NULL,
      last_modified TEXT NOT NULL,
      settings TEXT
    )
  `)

  // 文档表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      type TEXT DEFAULT 'chapter',
      content TEXT,
      created_at TEXT NOT NULL,
      last_modified TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      character_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `)

  // 版本提交表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS commits (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      message TEXT,
      content TEXT,
      timestamp TEXT NOT NULL,
      is_auto_commit INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      character_count INTEGER DEFAULT 0,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `)

  // 创建索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documents_book_id ON documents(book_id)
  `)
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_commits_document_id ON commits(document_id)
  `)

  console.log('✅ 数据库表创建成功')
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// ========== 书籍操作 ==========

export interface Book {
  id: string
  name: string
  description?: string
  author?: string
  genre?: string
  cover_image?: string
  created_at: string
  last_modified: string
  settings?: string
}

/**
 * 创建书籍
 */
export async function createBook(book: Omit<Book, 'id' | 'created_at' | 'last_modified'>): Promise<Book> {
  const database = getDatabase()
  
  const id = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const newBook: Book = {
    id,
    ...book,
    created_at: now,
    last_modified: now,
  }

  await database.execute(
    `INSERT INTO books (id, name, description, author, genre, cover_image, created_at, last_modified, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      newBook.id,
      newBook.name,
      newBook.description || null,
      newBook.author || null,
      newBook.genre || null,
      newBook.cover_image || null,
      newBook.created_at,
      newBook.last_modified,
      newBook.settings || null,
    ]
  )

  return newBook
}

/**
 * 获取所有书籍
 */
export async function getAllBooks(): Promise<Book[]> {
  const database = getDatabase()
  
  const result = await database.select<Book[]>(
    'SELECT * FROM books ORDER BY last_modified DESC'
  )
  
  return result
}

/**
 * 获取单个书籍
 */
export async function getBook(bookId: string): Promise<Book | null> {
  const database = getDatabase()
  
  const result = await database.select<Book[]>(
    'SELECT * FROM books WHERE id = $1',
    [bookId]
  )
  
  return result[0] || null
}

/**
 * 更新书籍
 */
export async function updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
  const database = getDatabase()
  
  const now = new Date().toISOString()
  
  await database.execute(
    `UPDATE books 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         author = COALESCE($3, author),
         genre = COALESCE($4, genre),
         cover_image = COALESCE($5, cover_image),
         settings = COALESCE($6, settings),
         last_modified = $7
     WHERE id = $8`,
    [
      updates.name || null,
      updates.description || null,
      updates.author || null,
      updates.genre || null,
      updates.cover_image || null,
      updates.settings || null,
      now,
      bookId,
    ]
  )
}

/**
 * 删除书籍
 */
export async function deleteBook(bookId: string): Promise<void> {
  const database = getDatabase()
  
  await database.execute('DELETE FROM books WHERE id = $1', [bookId])
}

// ========== 文档操作 ==========

export interface Document {
  id: string
  book_id: string
  title: string
  order_num: number
  type: string
  content?: string
  created_at: string
  last_modified: string
  word_count: number
  character_count: number
  status: string
}

/**
 * 创建文档
 */
export async function createDocument(doc: Omit<Document, 'id' | 'created_at' | 'last_modified'>): Promise<Document> {
  const database = getDatabase()
  
  const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const newDoc: Document = {
    id,
    ...doc,
    created_at: now,
    last_modified: now,
  }

  await database.execute(
    `INSERT INTO documents (id, book_id, title, order_num, type, content, created_at, last_modified, word_count, character_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      newDoc.id,
      newDoc.book_id,
      newDoc.title,
      newDoc.order_num,
      newDoc.type,
      newDoc.content || '',
      newDoc.created_at,
      newDoc.last_modified,
      newDoc.word_count,
      newDoc.character_count,
      newDoc.status,
    ]
  )

  return newDoc
}

/**
 * 获取书籍的所有文档
 */
export async function getDocumentsByBook(bookId: string): Promise<Document[]> {
  const database = getDatabase()
  
  const result = await database.select<Document[]>(
    'SELECT * FROM documents WHERE book_id = $1 ORDER BY order_num ASC, created_at ASC',
    [bookId]
  )
  
  return result
}

/**
 * 获取单个文档
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  const database = getDatabase()
  
  const result = await database.select<Document[]>(
    'SELECT * FROM documents WHERE id = $1',
    [documentId]
  )
  
  return result[0] || null
}

/**
 * 更新文档内容
 */
export async function updateDocument(documentId: string, content: string): Promise<void> {
  const database = getDatabase()
  
  const now = new Date().toISOString()
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
  const characterCount = content.length
  
  await database.execute(
    `UPDATE documents 
     SET content = $1,
         word_count = $2,
         character_count = $3,
         last_modified = $4
     WHERE id = $5`,
    [content, wordCount, characterCount, now, documentId]
  )
}

/**
 * 删除文档
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const database = getDatabase()
  
  await database.execute('DELETE FROM documents WHERE id = $1', [documentId])
}

// ========== 版本提交操作 ==========

export interface Commit {
  id: string
  document_id: string
  message?: string
  content: string
  timestamp: string
  is_auto_commit: number
  word_count: number
  character_count: number
}

/**
 * 创建提交
 */
export async function createCommit(commit: Omit<Commit, 'id' | 'timestamp'>): Promise<Commit> {
  const database = getDatabase()
  
  const id = `commit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  
  const newCommit: Commit = {
    id,
    ...commit,
    timestamp: now,
  }

  await database.execute(
    `INSERT INTO commits (id, document_id, message, content, timestamp, is_auto_commit, word_count, character_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      newCommit.id,
      newCommit.document_id,
      newCommit.message || null,
      newCommit.content,
      newCommit.timestamp,
      newCommit.is_auto_commit,
      newCommit.word_count,
      newCommit.character_count,
    ]
  )

  return newCommit
}

/**
 * 获取文档的所有提交
 */
export async function getCommitsByDocument(documentId: string): Promise<Commit[]> {
  const database = getDatabase()
  
  const result = await database.select<Commit[]>(
    'SELECT * FROM commits WHERE document_id = $1 ORDER BY timestamp DESC',
    [documentId]
  )
  
  return result
}

/**
 * 获取单个提交
 */
export async function getCommit(commitId: string): Promise<Commit | null> {
  const database = getDatabase()
  
  const result = await database.select<Commit[]>(
    'SELECT * FROM commits WHERE id = $1',
    [commitId]
  )
  
  return result[0] || null
}

/**
 * 删除文档的所有提交
 */
export async function deleteCommitsByDocument(documentId: string): Promise<void> {
  const database = getDatabase()
  
  await database.execute('DELETE FROM commits WHERE document_id = $1', [documentId])
}
