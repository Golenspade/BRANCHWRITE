import { WebFileSystemAdapter } from './webAdapter';

// 环境检测
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// 动态导入 Tauri API
let tauriInvoke: any = null;

const getTauriInvoke = async () => {
  if (!isTauriEnvironment()) {
    throw new Error('Tauri API is not available in web environment');
  }

  if (!tauriInvoke) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      tauriInvoke = invoke;
    } catch (error) {
      throw new Error('Failed to load Tauri API');
    }
  }

  return tauriInvoke;
};

// 错误处理工具类
class TauriError extends Error {
  public originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'TauriError';
    this.originalError = originalError;
  }
}

// 统一的错误处理函数
async function handleTauriCall<T>(
  command: string,
  args?: Record<string, any>
): Promise<T> {
  try {
    if (!isTauriEnvironment()) {
      throw new Error('This feature is only available in the desktop app');
    }

    const invoke = await getTauriInvoke();
    return await invoke(command, args) as T;
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);

    // 提供更友好的错误信息
    let friendlyMessage = `执行 ${command} 命令时发生错误`;

    if (typeof error === 'string') {
      friendlyMessage = error;
    } else if (error instanceof Error) {
      friendlyMessage = error.message;
    }

    throw new TauriError(friendlyMessage, error);
  }
}

// 类型定义
export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  created_at: string;
  last_modified: string;
  version: string;
  author: string;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  auto_save_interval: number;
  auto_commit_threshold: number;
  backup_enabled: boolean;
  backup_interval: number;
  editor_theme: string;
  font_size: number;
  line_height: number;
  font_family: string;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  created_at: string;
  last_modified: string;
  word_count: number;
  character_count: number;
  line_count: number;
  tags: string[];
}

export interface CommitInfo {
  id: string;
  timestamp: string;
  message: string;
  is_auto_commit: boolean;
  document_hash: string;
  word_count: number;
  character_count: number;
}

export interface ProjectData {
  config: ProjectConfig;
  document_content: string;
  document_metadata: DocumentMetadata;
  commits: CommitInfo[];
  commit_data: Record<string, string>;
}

export interface FileInfo {
  exists: boolean;
  is_file: boolean;
  is_dir: boolean;
  size: number;
  modified?: number;
}

export interface DirectoryItem {
  name: string;
  path: string;
  is_file: boolean;
  is_dir: boolean;
  size: number;
  modified?: number;
}

// 书籍管理相关类型定义
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

export interface BookConfig {
  id: string;
  name: string;
  description: string;
  author: string;
  genre: string;
  created_at: string;
  last_modified: string;
  cover_image?: string;
  tags: string[];
  settings: BookSettings;
}

export interface DocumentConfig {
  id: string;
  book_id: string;
  title: string;
  order: number;
  type: string; // 'chapter' | 'section' | 'note'
  created_at: string;
  last_modified: string;
  word_count: number;
  character_count: number;
  status: string; // 'draft' | 'review' | 'final'
}

export interface BookData {
  config: BookConfig;
  documents: DocumentConfig[];
  current_document_id?: string;
}

/**
 * 文件系统服务类
 */
export class FileSystemService {
  /**
   * 创建新项目
   */
  static async createProject(
    name: string,
    description: string,
    author: string
  ): Promise<ProjectData> {
    return await handleTauriCall<ProjectData>('create_project', { name, description, author });
  }

  /**
   * 保存项目
   */
  static async saveProject(projectData: ProjectData): Promise<void> {
    return await handleTauriCall<void>('save_project', { projectData });
  }

  /**
   * 加载项目
   */
  static async loadProject(projectId: string): Promise<ProjectData> {
    return await handleTauriCall<ProjectData>('load_project', { projectId });
  }

  /**
   * 列出所有项目
   */
  static async listProjects(): Promise<ProjectConfig[]> {
    return await handleTauriCall<ProjectConfig[]>('list_projects');
  }

  /**
   * 删除项目
   */
  static async deleteProject(projectId: string): Promise<void> {
    return await handleTauriCall<void>('delete_project', { projectId });
  }

  /**
   * 导出项目
   */
  static async exportProject(projectId: string, exportPath: string): Promise<void> {
    return await handleTauriCall<void>('export_project', { projectId, exportPath });
  }

  /**
   * 获取项目统计信息
   */
  static async getProjectStats(projectId: string): Promise<Record<string, any>> {
    return await handleTauriCall<Record<string, any>>('get_project_stats', { projectId });
  }

  /**
   * 选择文件夹
   */
  static async selectFolder(): Promise<string | null> {
    return await handleTauriCall<string | null>('select_folder');
  }

  /**
   * 选择文件
   */
  static async selectFile(filters: Array<[string, string[]]>): Promise<string | null> {
    return await handleTauriCall<string | null>('select_file', { filters });
  }

  /**
   * 显示消息对话框
   */
  static async showMessage(
    title: string,
    message: string,
    kind: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    if (!isTauriEnvironment()) {
      return await WebFileSystemAdapter.showMessage(title, message, kind);
    }
    return await handleTauriCall('show_message', { title, message, kind });
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(path: string): Promise<boolean> {
    return await handleTauriCall('file_exists', { path });
  }

  /**
   * 创建目录
   */
  static async createDirectory(path: string): Promise<void> {
    return await handleTauriCall('create_directory', { path });
  }

  /**
   * 读取文件内容
   */
  static async readFile(path: string): Promise<string> {
    return await handleTauriCall('read_file', { path });
  }

  /**
   * 写入文件内容
   */
  static async writeFile(path: string, content: string): Promise<void> {
    return await handleTauriCall('write_file', { path, content });
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(path: string): Promise<FileInfo> {
    return await handleTauriCall('get_file_info', { path });
  }

  /**
   * 列出目录内容
   */
  static async listDirectory(path: string): Promise<DirectoryItem[]> {
    return await handleTauriCall('list_directory', { path });
  }

  /**
   * 获取应用数据目录
   */
  static async getAppDataDir(): Promise<string> {
    return await handleTauriCall('get_app_data_dir');
  }

  /**
   * 获取用户文档目录
   */
  static async getDocumentsDir(): Promise<string> {
    return await handleTauriCall('get_documents_dir');
  }

  /**
   * 获取桌面目录
   */
  static async getDesktopDir(): Promise<string> {
    return await handleTauriCall('get_desktop_dir');
  }

  /**
   * 写入文本文件
   */
  static async writeTextFile(filePath: string, content: string): Promise<void> {
    return await handleTauriCall('write_file', { path: filePath, content });
  }

  // ===== 书籍管理方法 =====

  /**
   * 创建新书籍
   */
  static async createBook(
    name: string,
    description: string,
    author: string,
    genre: string
  ): Promise<BookData> {
    if (!isTauriEnvironment()) {
      // Web 环境下创建项目（映射为书籍）
      const project = await WebFileSystemAdapter.createProject(name, description, author);
      return {
        config: {
          id: project.id,
          name: project.name,
          description: project.description,
          author: project.author,
          genre: genre || 'general',
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
            font_family: 'system-ui',
          },
        },
        documents: [],
      };
    }
    return await handleTauriCall<BookData>('create_book', { name, description, author, genre });
  }

  /**
   * 列出所有书籍
   */
  static async listBooks(): Promise<BookConfig[]> {
    if (!isTauriEnvironment()) {
      const projects = await WebFileSystemAdapter.listProjects();
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
      }));
    }
    return await handleTauriCall<BookConfig[]>('list_books');
  }

  /**
   * 加载书籍数据
   */
  static async loadBook(bookId: string): Promise<BookData> {
    if (!isTauriEnvironment()) {
      const project = await WebFileSystemAdapter.loadProject(bookId);
      if (!project) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      const documents = await WebFileSystemAdapter.listDocuments(bookId);
      return {
        config: {
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
        },
        documents,
      };
    }
    return await handleTauriCall<BookData>('load_book', { bookId });
  }

  /**
   * 保存书籍数据
   */
  static async saveBook(bookData: BookData): Promise<void> {
    if (!isTauriEnvironment()) {
      const project: ProjectConfig = {
        id: bookData.config.id,
        name: bookData.config.name,
        description: bookData.config.description,
        author: bookData.config.author,
        created_at: bookData.config.created_at,
        last_modified: new Date().toISOString(),
        version: '1.0.0',
        settings: {
          auto_save_interval: bookData.config.settings.auto_save_interval,
          auto_commit_threshold: 100,
          backup_enabled: true,
          backup_interval: 300,
          editor_theme: bookData.config.settings.editor_theme,
          font_size: bookData.config.settings.font_size,
          line_height: bookData.config.settings.line_height,
          font_family: bookData.config.settings.font_family,
        },
      };
      return await WebFileSystemAdapter.saveProject(project);
    }
    return await handleTauriCall<void>('save_book', { bookData });
  }

  /**
   * 删除书籍
   */
  static async deleteBook(bookId: string): Promise<void> {
    if (!isTauriEnvironment()) {
      return await WebFileSystemAdapter.deleteProject(bookId);
    }
    return await handleTauriCall<void>('delete_book', { bookId });
  }

  // ===== 文档管理方法 =====

  /**
   * 创建新文档
   */
  static async createDocument(
    bookId: string,
    title: string,
    docType: string
  ): Promise<DocumentConfig> {
    if (!isTauriEnvironment()) {
      return await WebFileSystemAdapter.createDocument(bookId, title, docType);
    }
    return await handleTauriCall<DocumentConfig>('create_document', { bookId, title, docType });
  }

  /**
   * 列出书籍的所有文档
   */
  static async listDocuments(bookId: string): Promise<DocumentConfig[]> {
    if (!isTauriEnvironment()) {
      return await WebFileSystemAdapter.listDocuments(bookId);
    }
    return await handleTauriCall<DocumentConfig[]>('list_documents', { bookId });
  }

  /**
   * 加载文档内容
   */
  static async loadDocument(bookId: string, documentId: string): Promise<string> {
    if (!isTauriEnvironment()) {
      return await WebFileSystemAdapter.loadDocument(bookId, documentId);
    }
    return await handleTauriCall<string>('load_document', { bookId, documentId });
  }

  /**
   * 保存文档内容
   */
  static async saveDocument(
    bookId: string,
    documentId: string,
    content: string
  ): Promise<void> {
    if (!isTauriEnvironment()) {
      return await WebFileSystemAdapter.saveDocument(bookId, documentId, content);
    }
    return await handleTauriCall<void>('save_document', { bookId, documentId, content });
  }

  /**
   * 删除文档
   */
  static async deleteDocument(bookId: string, documentId: string): Promise<void> {
    if (!isTauriEnvironment()) {
      // Web 环境下删除文档
      const documents = await WebFileSystemAdapter.listDocuments(bookId);
      const filteredDocs = documents.filter(d => d.id !== documentId);
      const documentKey = `branchwrite_documents_${bookId}`;
      localStorage.setItem(documentKey, JSON.stringify(filteredDocs));

      // 删除文档内容
      const contentKey = `branchwrite_content_${bookId}_${documentId}`;
      localStorage.removeItem(contentKey);
      return;
    }
    return await handleTauriCall<void>('delete_document', { bookId, documentId });
  }
}

/**
 * 项目管理器类
 */
export class ProjectManager {
  private static currentProject: ProjectData | null = null;

  /**
   * 获取当前项目
   */
  static getCurrentProject(): ProjectData | null {
    return this.currentProject;
  }

  /**
   * 设置当前项目
   */
  static setCurrentProject(project: ProjectData | null): void {
    this.currentProject = project;
  }

  /**
   * 创建新项目并设为当前项目
   */
  static async createAndSetProject(
    name: string,
    description: string,
    author: string
  ): Promise<ProjectData> {
    const project = await FileSystemService.createProject(name, description, author);
    this.setCurrentProject(project);
    return project;
  }

  /**
   * 加载项目并设为当前项目
   */
  static async loadAndSetProject(projectId: string): Promise<ProjectData> {
    const project = await FileSystemService.loadProject(projectId);
    this.setCurrentProject(project);
    return project;
  }

  /**
   * 保存当前项目
   */
  static async saveCurrentProject(): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No current project to save');
    }
    await FileSystemService.saveProject(this.currentProject);
  }

  /**
   * 更新当前项目的文档内容
   */
  static updateDocumentContent(content: string): void {
    if (!this.currentProject) {
      throw new Error('No current project');
    }

    this.currentProject.document_content = content;
    
    // 更新元数据
    const now = new Date().toISOString();
    this.currentProject.document_metadata.last_modified = now;
    this.currentProject.config.last_modified = now;
    
    // 更新统计信息
    const lines = content.split('\n');
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    
    this.currentProject.document_metadata.character_count = content.length;
    this.currentProject.document_metadata.word_count = words.length;
    this.currentProject.document_metadata.line_count = lines.length;
  }

  /**
   * 添加提交记录
   */
  static addCommit(message: string, isAutoCommit: boolean = false): void {
    if (!this.currentProject) {
      throw new Error('No current project');
    }

    const commitId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    
    const commit: CommitInfo = {
      id: commitId,
      timestamp: now,
      message,
      is_auto_commit: isAutoCommit,
      document_hash: this.generateHash(this.currentProject.document_content),
      word_count: this.currentProject.document_metadata.word_count,
      character_count: this.currentProject.document_metadata.character_count,
    };

    this.currentProject.commits.unshift(commit);
    this.currentProject.commit_data[commitId] = this.currentProject.document_content;
  }

  /**
   * 生成内容哈希
   */
  private static generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 获取项目统计信息
   */
  static getProjectStats(): Record<string, any> | null {
    if (!this.currentProject) {
      return null;
    }

    return {
      totalCommits: this.currentProject.commits.length,
      autoCommits: this.currentProject.commits.filter(c => c.is_auto_commit).length,
      manualCommits: this.currentProject.commits.filter(c => !c.is_auto_commit).length,
      currentWordCount: this.currentProject.document_metadata.word_count,
      currentCharacterCount: this.currentProject.document_metadata.character_count,
      currentLineCount: this.currentProject.document_metadata.line_count,
      createdAt: this.currentProject.config.created_at,
      lastModified: this.currentProject.config.last_modified,
    };
  }

  /**
   * 检查是否有未保存的更改
   */
  static hasUnsavedChanges(): boolean {
    if (!this.currentProject) {
      return false;
    }

    // 简单的检查：比较最后一次提交的内容和当前内容
    const lastCommit = this.currentProject.commits[0];
    if (!lastCommit) {
      return this.currentProject.document_content.length > 0;
    }

    const lastCommitContent = this.currentProject.commit_data[lastCommit.id] || '';
    return lastCommitContent !== this.currentProject.document_content;
  }
}
