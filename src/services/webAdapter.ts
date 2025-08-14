/**
 * Web 环境适配器 - 为纯 web 环境提供基本功能
 */

import type { ProjectConfig, DocumentConfig } from './fileSystemService';

// 模拟的项目数据存储
const STORAGE_KEY = 'branchwrite_projects';
const CURRENT_PROJECT_KEY = 'branchwrite_current_project';

/**
 * Web 环境的文件系统适配器
 */
export class WebFileSystemAdapter {
  /**
   * 检查是否在 Web 环境
   */
  static isWebEnvironment(): boolean {
    return typeof window !== 'undefined' && !('__TAURI__' in window);
  }

  /**
   * 获取存储的项目列表
   */
  static getStoredProjects(): ProjectConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 保存项目列表
   */
  static saveProjects(projects: ProjectConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  /**
   * 创建新项目（Web 版本）
   */
  static async createProject(
    name: string,
    description: string,
    author: string
  ): Promise<ProjectConfig> {
    const projects = this.getStoredProjects();
    
    const newProject: ProjectConfig = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      author,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      version: '1.0.0',
      settings: {
        auto_save_interval: 30,
        auto_commit_threshold: 100,
        backup_enabled: true,
        backup_interval: 300,
        editor_theme: 'default',
        font_size: 14,
        line_height: 1.5,
        font_family: 'system-ui',
      },
    };

    projects.unshift(newProject);
    this.saveProjects(projects);
    
    return newProject;
  }

  /**
   * 获取项目列表（Web 版本）
   */
  static async listProjects(): Promise<ProjectConfig[]> {
    return this.getStoredProjects();
  }

  /**
   * 加载项目（Web 版本）
   */
  static async loadProject(projectId: string): Promise<ProjectConfig | null> {
    const projects = this.getStoredProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * 保存项目（Web 版本）
   */
  static async saveProject(project: ProjectConfig): Promise<void> {
    const projects = this.getStoredProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    project.last_modified = new Date().toISOString();
    
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.unshift(project);
    }
    
    this.saveProjects(projects);
  }

  /**
   * 删除项目（Web 版本）
   */
  static async deleteProject(projectId: string): Promise<void> {
    const projects = this.getStoredProjects();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    this.saveProjects(filteredProjects);
    
    // 清理项目相关的文档数据
    const documentKey = `branchwrite_documents_${projectId}`;
    localStorage.removeItem(documentKey);
  }

  /**
   * 获取项目的文档列表（Web 版本）
   */
  static async listDocuments(projectId: string): Promise<DocumentConfig[]> {
    try {
      const documentKey = `branchwrite_documents_${projectId}`;
      const stored = localStorage.getItem(documentKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 创建文档（Web 版本）
   */
  static async createDocument(
    projectId: string,
    title: string,
    docType: string
  ): Promise<DocumentConfig> {
    const documents = await this.listDocuments(projectId);
    
    const newDocument: DocumentConfig = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      doc_type: docType,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      word_count: 0,
      character_count: 0,
      version: 1,
      status: 'draft',
      tags: [],
      metadata: {},
    };

    documents.unshift(newDocument);
    
    const documentKey = `branchwrite_documents_${projectId}`;
    localStorage.setItem(documentKey, JSON.stringify(documents));
    
    return newDocument;
  }

  /**
   * 加载文档内容（Web 版本）
   */
  static async loadDocument(projectId: string, documentId: string): Promise<string> {
    try {
      const contentKey = `branchwrite_content_${projectId}_${documentId}`;
      return localStorage.getItem(contentKey) || '';
    } catch {
      return '';
    }
  }

  /**
   * 保存文档内容（Web 版本）
   */
  static async saveDocument(
    projectId: string,
    documentId: string,
    content: string
  ): Promise<void> {
    try {
      const contentKey = `branchwrite_content_${projectId}_${documentId}`;
      localStorage.setItem(contentKey, content);
      
      // 更新文档元数据
      const documents = await this.listDocuments(projectId);
      const docIndex = documents.findIndex(d => d.id === documentId);
      
      if (docIndex >= 0) {
        documents[docIndex].last_modified = new Date().toISOString();
        documents[docIndex].word_count = content.split(/\s+/).filter(w => w.length > 0).length;
        documents[docIndex].character_count = content.length;
        
        const documentKey = `branchwrite_documents_${projectId}`;
        localStorage.setItem(documentKey, JSON.stringify(documents));
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  }

  /**
   * 导出文档为文件（Web 版本）
   */
  static async exportDocument(
    filename: string,
    content: string,
    format: string = 'markdown'
  ): Promise<void> {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export document:', error);
      throw new Error('导出文件失败');
    }
  }

  /**
   * 显示消息（Web 版本）
   */
  static async showMessage(
    title: string,
    message: string,
    kind: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    // 在 Web 环境中使用 alert 或者可以集成更好的通知组件
    const prefix = kind === 'error' ? '❌' : kind === 'warning' ? '⚠️' : 'ℹ️';
    alert(`${prefix} ${title}\n\n${message}`);
  }
}
