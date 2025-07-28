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

// Tauri 命令类型
export interface TauriCommands {
  saveContent: (filePath: string, content: string) => Promise<void>;
  loadContent: (filePath: string) => Promise<string>;
  saveHistory: (filePath: string, historyData: string) => Promise<void>;
  loadHistory: (filePath: string) => Promise<string>;
  initProject: (folderPath: string, projectName: string) => Promise<void>;
  openProject: (folderPath: string) => Promise<ProjectConfig>;
  exportMarkdown: (filePath: string, content: string) => Promise<void>;
}
