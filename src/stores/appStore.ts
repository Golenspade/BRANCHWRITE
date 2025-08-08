import { create } from 'zustand';
import type { AppState, CommitInfo, ProjectConfig, BookConfig, BookData, DocumentConfig } from '../types/index';
import { DocumentManager } from '../models/DocumentManager';
import { FileSystemService } from '../services/fileSystemService';

interface AppStore extends AppState {
  // 项目相关（保持向后兼容）
  projectConfig: ProjectConfig | null;
  projectPath: string | null;

  // 版本管理
  commits: CommitInfo[];

  // 书籍管理
  currentBook: BookData | null;
  books: BookConfig[];
  showBookSelector: boolean;

  // 文档管理
  currentDocumentConfig: DocumentConfig | null;
  documents: DocumentConfig[];

  // 文档相关（保持原有接口）
  setCurrentDocument: (content: string) => void;
  initializeDocument: (initialText?: string, title?: string) => void;

  // 项目管理
  createProject: (name: string, path: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;

  // 版本管理（简化版）
  createCommit: (message: string) => void;
  checkoutCommit: (commitId: string) => void;
  getCommitDiff: (commitId: string) => any;

  // 书本管理
  loadBooks: () => Promise<void>;
  loadBook: (bookId: string) => Promise<void>;
  selectBook: (bookId: string) => Promise<void>;
  createBook: (name: string, description: string, author: string, genre: string) => Promise<string>;
  updateBook: (bookId: string, config: Partial<BookConfig>) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  listBooks: () => Promise<BookConfig[]>;

  // 文档管理
  loadDocuments: (bookId: string) => Promise<void>;
  loadDocumentContent: (bookId: string, documentId: string) => Promise<string>;
  saveDocumentContent: (bookId: string, documentId: string, content: string) => Promise<void>;
  selectDocument: (document: DocumentConfig) => void;
  createDocument: (bookId: string, title: string, docType: string) => Promise<string>;
  updateDocument: (documentId: string, updates: Partial<DocumentConfig>) => Promise<void>;
  deleteDocument: (bookId: string, documentId: string) => Promise<void>;
  switchDocument: (documentId: string) => Promise<void>;

  // DocumentManager 相关
  documentManager: DocumentManager | null;
  initializeDocumentManager: (content: string, title: string) => void;

  // 设置
  updateSettings: (settings: Partial<any>) => void;
  setShowBookSelector: (show: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // 初始状态
  currentDocument: '',
  isHistoryPanelOpen: false,
  isDiffViewOpen: false,
  selectedCommits: [],
  currentMode: 'edit',
  isLoading: false,
  error: null,
  commits: [],

  // 项目相关
  projectConfig: null,
  projectPath: null,

  // 书籍相关
  currentBook: null,
  books: [],
  showBookSelector: true, // 默认显示书本选择器

  // 文档管理
  currentDocumentConfig: null,
  documents: [],

  // DocumentManager
  documentManager: null,

  // 文档初始化
  initializeDocument: (initialText: string = '', title: string = 'Untitled') => {
    set({
      currentDocument: initialText,
      commits: [],
    });
  },

  // 文档操作
  setCurrentDocument: (content: string) => {
    set({ currentDocument: content });
  },

  // 项目管理（简化版）
  createProject: async (name: string, path: string) => {
    try {
      set({ isLoading: true, error: null });
      // 简化版本，暂时不实现
      console.log('Create project:', name, path);
      set({ isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create project', isLoading: false });
    }
  },

  loadProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      // 简化版本，暂时不实现
      console.log('Load project:', projectId);
      set({ isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load project', isLoading: false });
    }
  },

  saveProject: async () => {
    try {
      // 简化版本，暂时不实现
      console.log('Save project');
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save project' });
    }
  },

  // 版本管理（简化版）
  createCommit: (message: string) => {
    const newCommit: CommitInfo = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message,
      isAutoCommit: false,
    };
    const { commits } = get();
    set({ commits: [newCommit, ...commits] });
  },

  checkoutCommit: (commitId: string) => {
    console.log('Checkout commit:', commitId);
  },

  getCommitDiff: (commitId: string) => {
    console.log('Get commit diff:', commitId);
    return null;
  },

  // 书本管理（简化版）
  loadBooks: async () => {
    try {
      set({ isLoading: true, error: null });

      // 获取书本列表
      const booksList = await get().listBooks();
      set({
        books: booksList,
        isLoading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load books', isLoading: false });
    }
  },

  selectBook: async (bookId: string) => {
    try {
      await get().loadBook(bookId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to select book' });
    }
  },

  loadBook: async (bookId: string) => {
    try {
      set({ isLoading: true, error: null });

      const bookData = await FileSystemService.loadBook(bookId);

      set({
        currentBook: bookData,
        documents: bookData.documents,
        currentDocumentConfig: bookData.documents[0] || null,
        showBookSelector: false,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load book', isLoading: false });
    }
  },

  createBook: async (name: string, description: string, author: string, genre: string) => {
    try {
      const bookData = await FileSystemService.createBook(
        name,
        description,
        author,
        genre
      );

      // 更新本地书籍列表
      const { books } = get();
      set({ books: [bookData.config, ...books] });

      return bookData.config.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create book' });
      throw error;
    }
  },

  updateBook: async (bookId: string, config: Partial<BookConfig>) => {
    try {
      console.log('Update book:', bookId, config);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update book' });
    }
  },

  deleteBook: async (bookId: string) => {
    try {
      await FileSystemService.deleteBook(bookId);

      // 更新本地书籍列表
      const { books, currentBook } = get();
      const updatedBooks = books.filter(book => book.id !== bookId);
      set({ books: updatedBooks });

      // 如果删除的是当前书籍，清除当前书籍状态
      if (currentBook?.config.id === bookId) {
        set({
          currentBook: null,
          documents: [],
          currentDocumentConfig: null,
          currentDocument: '',
          showBookSelector: true,
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete book' });
    }
  },

  listBooks: async () => {
    try {
      return await FileSystemService.listBooks();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to list books' });
      return [];
    }
  },

  // 文档管理（简化版）
  createDocument: async (bookId: string, title: string, docType: string) => {
    try {
      const newDoc = await FileSystemService.createDocument(bookId, title, docType);

      // 更新文档列表
      const { documents } = get();
      set({ documents: [...documents, newDoc] });

      return newDoc.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create document' });
      throw error;
    }
  },

  updateDocument: async (documentId: string, updates: Partial<DocumentConfig>) => {
    try {
      console.log('Update document:', documentId, updates);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update document' });
    }
  },

  deleteDocument: async (bookId: string, documentId: string) => {
    try {
      await FileSystemService.deleteDocument(bookId, documentId);

      // 从文档列表中移除
      const { documents } = get();
      const updatedDocuments = documents.filter(doc => doc.id !== documentId);
      set({ documents: updatedDocuments });

      // 如果删除的是当前文档，清空当前文档
      const { currentDocumentConfig } = get();
      if (currentDocumentConfig?.id === documentId) {
        set({ currentDocumentConfig: null, currentDocument: '' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete document' });
    }
  },

  switchDocument: async (documentId: string) => {
    try {
      console.log('Switch document:', documentId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to switch document' });
    }
  },

  // 文档内容管理
  loadDocuments: async (bookId: string) => {
    try {
      set({ isLoading: true, error: null });

      const documents = await FileSystemService.listDocuments(bookId);

      set({
        documents,
        isLoading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load documents', isLoading: false });
    }
  },

  loadDocumentContent: async (bookId: string, documentId: string) => {
    try {
      return await FileSystemService.loadDocument(bookId, documentId);
    } catch (error) {
      console.error('Failed to load document content:', error);
      throw error;
    }
  },

  saveDocumentContent: async (bookId: string, documentId: string, content: string) => {
    try {
      await FileSystemService.saveDocument(bookId, documentId, content);

      // 更新文档管理器
      const { documentManager } = get();
      if (documentManager) {
        documentManager.updateDocument(content);
      }
    } catch (error) {
      console.error('Failed to save document content:', error);
      throw error;
    }
  },

  selectDocument: (document: DocumentConfig) => {
    set({ currentDocumentConfig: document });
  },

  // DocumentManager 相关
  initializeDocumentManager: (content: string, title: string) => {
    const manager = new DocumentManager(content, title);
    set({ documentManager: manager });
  },

  // 设置
  updateSettings: (settings: Partial<any>) => {
    console.log('Update settings:', settings);
  },

  setShowBookSelector: (show: boolean) => {
    set({ showBookSelector: show });
  },
}));
