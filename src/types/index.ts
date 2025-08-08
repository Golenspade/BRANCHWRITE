// 核心数据类型定义

export interface Commit {
  id: string;
  timestamp: number;
  message: string;
  documentState: Uint8Array;
  isAutoCommit: boolean;
}

export interface CommitInfo {
  id: string;
  timestamp: number;
  message: string;
  isAutoCommit: boolean;
}

export interface DiffResult {
  oldText: string;
  newText: string;
  changes: DiffChange[];
}

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumber?: number;
}

export interface ProjectConfig {
  name: string;
  createdAt: number;
  lastModified: number;
  autoCommitInterval: number; // 分钟
  autoCommitWordCount: number; // 字数
}

export interface TextOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

// UI 状态类型
export interface AppState {
  currentDocument: string;
  isHistoryPanelOpen: boolean;
  isDiffViewOpen: boolean;
  selectedCommits: string[];
  currentMode: 'edit' | 'preview' | 'diff';
  isLoading: boolean;
  error: string | null;
}

// 书籍相关类型
export interface BookConfig {
  id: string;
  name: string;
  description: string;
  author: string;
  genre: string; // 类型：小说、散文、技术文档等
  created_at: string;
  last_modified: string;
  cover_image?: string;
  tags: string[];
  settings: BookSettings;
}

export interface BookSettings {
  outline_enabled: boolean;
  timeline_enabled: boolean;
  auto_save_interval: number; // 分钟
  target_word_count?: number;
  deadline?: string;
  editor_theme: string;
  font_size: number;
  line_height: number;
  font_family: string;
}

// 文档（稿子/章节）相关类型
export interface DocumentConfig {
  id: string;
  book_id: string; // 关联的书籍ID
  title: string;
  order: number; // 在书籍中的顺序
  type: string; // 文档类型: 'chapter' | 'section' | 'note'
  created_at: string;
  last_modified: string;
  word_count: number;
  character_count: number;
  status: string; // 状态: 'draft' | 'review' | 'final'
}

export interface BookData {
  config: BookConfig;
  documents: DocumentConfig[];
  current_document_id?: string;
}

// Tauri 命令类型
export interface TauriCommands {
  saveContent: (filePath: string, content: string) => Promise<void>;
  loadContent: (filePath: string) => Promise<string>;
  saveHistory: (filePath: string, historyData: string) => Promise<void>;
  loadHistory: (filePath: string) => Promise<string>;
  initProject: (folderPath: string, projectName: string) => Promise<void>;
  openProject: (folderPath: string) => Promise<ProjectConfig>;
  exportMarkdown: (filePath: string, content: string) => Promise<void>;

  // 书籍管理命令
  createBook: (name: string, description: string, author: string, genre: string) => Promise<BookData>;
  listBooks: () => Promise<BookConfig[]>;
  loadBook: (bookId: string) => Promise<BookData>;
  saveBook: (bookData: BookData) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;

  // 文档管理命令
  createDocument: (bookId: string, title: string, docType: string) => Promise<DocumentConfig>;
  listDocuments: (bookId: string) => Promise<DocumentConfig[]>;
  loadDocument: (bookId: string, documentId: string) => Promise<string>;
  saveDocument: (bookId: string, documentId: string, content: string) => Promise<void>;
  deleteDocument: (bookId: string, documentId: string) => Promise<void>;
}
