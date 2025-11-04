/**
 * 存储适配器 - 自动选择 SQLite 或 localStorage
 */

import type { BookConfig, DocumentConfig } from './fileSystemService'

// 检测是否在 Tauri 环境
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

let useSQLite = false

// 尝试初始化 SQLite
export async function initStorage(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { initDatabase } = await import('./database')
      await initDatabase()
      useSQLite = true
      console.log('✅ 使用 SQLite 数据库')
    } catch (error) {
      console.warn('⚠️ SQLite 初始化失败，回退到 localStorage:', error)
      useSQLite = false
    }
  } else {
    console.log('ℹ️ Web 环境，使用 localStorage')
    useSQLite = false
  }
}

// ========== 书籍操作 ==========

export async function createBook(
  name: string,
  description: string,
  author: string,
  genre: string
): Promise<BookConfig> {
  if (useSQLite) {
    const { createBook: createBookDB } = await import('./database')
    const book = await createBookDB({
      name,
      description,
      author,
      genre,
      settings: JSON.stringify({
        outline_enabled: true,
        timeline_enabled: true,
        auto_save_interval: 30,
        editor_theme: 'default',
        font_size: 16,
        line_height: 1.6,
        font_family: 'system-ui',
      }),
    })
    
    return {
      id: book.id,
      name: book.name,
      description: book.description || '',
      author: book.author || '',
      genre: book.genre || '',
      created_at: book.created_at,
      last_modified: book.last_modified,
      tags: [],
      settings: JSON.parse(book.settings || '{}'),
    }
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    const project = await WebFileSystemAdapter.createProject(name, description, author)
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      author: project.author,
      genre,
      created_at: project.created_at,
      last_modified: project.last_modified,
      tags: [],
      settings: {
        outline_enabled: true,
        timeline_enabled: true,
        auto_save_interval: project.settings.auto_save_interval,
        editor_theme: project.settings.editor_theme,
        font_size: project.settings.font_size,
        line_height: project.settings.line_height,
        font_family: project.settings.font_family,
      },
    }
  }
}

export async function listBooks(): Promise<BookConfig[]> {
  if (useSQLite) {
    const { getAllBooks } = await import('./database')
    const books = await getAllBooks()
    
    return books.map(book => ({
      id: book.id,
      name: book.name,
      description: book.description || '',
      author: book.author || '',
      genre: book.genre || '',
      created_at: book.created_at,
      last_modified: book.last_modified,
      tags: [],
      settings: JSON.parse(book.settings || '{}'),
    }))
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    const projects = await WebFileSystemAdapter.listProjects()
    
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      author: project.author,
      genre: 'general',
      created_at: project.created_at,
      last_modified: project.last_modified,
      tags: [],
      settings: {
        outline_enabled: true,
        timeline_enabled: true,
        auto_save_interval: project.settings.auto_save_interval,
        editor_theme: project.settings.editor_theme,
        font_size: project.settings.font_size,
        line_height: project.settings.line_height,
        font_family: project.settings.font_family,
      },
    }))
  }
}

export async function deleteBook(bookId: string): Promise<void> {
  if (useSQLite) {
    const { deleteBook: deleteBookDB } = await import('./database')
    await deleteBookDB(bookId)
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    await WebFileSystemAdapter.deleteProject(bookId)
  }
}

// ========== 文档操作 ==========

export async function createDocument(
  bookId: string,
  title: string,
  type: string
): Promise<DocumentConfig> {
  if (useSQLite) {
    const { createDocument: createDocDB, getDocumentsByBook } = await import('./database')
    const existingDocs = await getDocumentsByBook(bookId)
    
    const doc = await createDocDB({
      book_id: bookId,
      title,
      type,
      order_num: existingDocs.length,
      content: '',
      word_count: 0,
      character_count: 0,
      status: 'draft',
    })
    
    return {
      id: doc.id,
      book_id: doc.book_id,
      title: doc.title,
      order: doc.order_num,
      type: doc.type,
      created_at: doc.created_at,
      last_modified: doc.last_modified,
      word_count: doc.word_count,
      character_count: doc.character_count,
      status: doc.status,
    }
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    return await WebFileSystemAdapter.createDocument(bookId, title, type)
  }
}

export async function listDocuments(bookId: string): Promise<DocumentConfig[]> {
  if (useSQLite) {
    const { getDocumentsByBook } = await import('./database')
    const docs = await getDocumentsByBook(bookId)
    
    return docs.map(doc => ({
      id: doc.id,
      book_id: doc.book_id,
      title: doc.title,
      order: doc.order_num,
      type: doc.type,
      created_at: doc.created_at,
      last_modified: doc.last_modified,
      word_count: doc.word_count,
      character_count: doc.character_count,
      status: doc.status,
    }))
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    return await WebFileSystemAdapter.listDocuments(bookId)
  }
}

export async function loadDocument(bookId: string, documentId: string): Promise<string> {
  if (useSQLite) {
    const { getDocument } = await import('./database')
    const doc = await getDocument(documentId)
    return doc?.content || ''
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    return await WebFileSystemAdapter.loadDocument(bookId, documentId)
  }
}

export async function saveDocument(
  bookId: string,
  documentId: string,
  content: string
): Promise<void> {
  if (useSQLite) {
    const { updateDocument } = await import('./database')
    await updateDocument(documentId, content)
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    await WebFileSystemAdapter.saveDocument(bookId, documentId, content)
  }
}

export async function deleteDocument(bookId: string, documentId: string): Promise<void> {
  if (useSQLite) {
    const { deleteDocument: deleteDocDB } = await import('./database')
    await deleteDocDB(documentId)
  } else {
    const { WebFileSystemAdapter } = await import('./webAdapter')
    const documents = await WebFileSystemAdapter.listDocuments(bookId)
    const filteredDocs = documents.filter(d => d.id !== documentId)
    const documentKey = `branchwrite_documents_${bookId}`
    localStorage.setItem(documentKey, JSON.stringify(filteredDocs))
    
    const contentKey = `branchwrite_content_${bookId}_${documentId}`
    localStorage.removeItem(contentKey)
  }
}
