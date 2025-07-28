import { invoke } from '@tauri-apps/api/core';

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
    return await invoke('create_project', { name, description, author });
  }

  /**
   * 保存项目
   */
  static async saveProject(projectData: ProjectData): Promise<void> {
    return await invoke('save_project', { projectData });
  }

  /**
   * 加载项目
   */
  static async loadProject(projectId: string): Promise<ProjectData> {
    return await invoke('load_project', { projectId });
  }

  /**
   * 列出所有项目
   */
  static async listProjects(): Promise<ProjectConfig[]> {
    return await invoke('list_projects');
  }

  /**
   * 删除项目
   */
  static async deleteProject(projectId: string): Promise<void> {
    return await invoke('delete_project', { projectId });
  }

  /**
   * 导出项目
   */
  static async exportProject(projectId: string, exportPath: string): Promise<void> {
    return await invoke('export_project', { projectId, exportPath });
  }

  /**
   * 获取项目统计信息
   */
  static async getProjectStats(projectId: string): Promise<Record<string, any>> {
    return await invoke('get_project_stats', { projectId });
  }

  /**
   * 选择文件夹
   */
  static async selectFolder(): Promise<string | null> {
    return await invoke('select_folder');
  }

  /**
   * 选择文件
   */
  static async selectFile(filters: Array<[string, string[]]>): Promise<string | null> {
    return await invoke('select_file', { filters });
  }

  /**
   * 显示消息对话框
   */
  static async showMessage(
    title: string,
    message: string,
    kind: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    return await invoke('show_message', { title, message, kind });
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(path: string): Promise<boolean> {
    return await invoke('file_exists', { path });
  }

  /**
   * 创建目录
   */
  static async createDirectory(path: string): Promise<void> {
    return await invoke('create_directory', { path });
  }

  /**
   * 读取文件内容
   */
  static async readFile(path: string): Promise<string> {
    return await invoke('read_file', { path });
  }

  /**
   * 写入文件内容
   */
  static async writeFile(path: string, content: string): Promise<void> {
    return await invoke('write_file', { path, content });
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(path: string): Promise<FileInfo> {
    return await invoke('get_file_info', { path });
  }

  /**
   * 列出目录内容
   */
  static async listDirectory(path: string): Promise<DirectoryItem[]> {
    return await invoke('list_directory', { path });
  }

  /**
   * 获取应用数据目录
   */
  static async getAppDataDir(): Promise<string> {
    return await invoke('get_app_data_dir');
  }

  /**
   * 获取用户文档目录
   */
  static async getDocumentsDir(): Promise<string> {
    return await invoke('get_documents_dir');
  }

  /**
   * 获取桌面目录
   */
  static async getDesktopDir(): Promise<string> {
    return await invoke('get_desktop_dir');
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
