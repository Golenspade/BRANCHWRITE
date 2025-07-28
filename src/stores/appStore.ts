import { create } from 'zustand';
import { AppState, CommitInfo, ProjectConfig } from '../types';
import { DocumentManager } from '../models/DocumentManager';
import { ProjectManager, ProjectData } from '../services/fileSystemService';

interface AppStore extends AppState {
  // 项目相关
  projectConfig: ProjectConfig | null;
  projectPath: string | null;
  currentProject: ProjectData | null;

  // 文档管理器
  documentManager: DocumentManager | null;

  // 文档相关
  setCurrentDocument: (content: string) => void;
  initializeDocument: (initialText?: string, title?: string) => void;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;

  // 版本管理
  createCommit: (message: string) => void;
  checkoutCommit: (commitId: string) => boolean;

  // 历史相关
  commits: CommitInfo[];
  setCommits: (commits: CommitInfo[]) => void;
  addCommit: (commit: CommitInfo) => void;
  refreshCommitHistory: () => void;
  
  // UI 状态
  setHistoryPanelOpen: (open: boolean) => void;
  setDiffViewOpen: (open: boolean) => void;
  setSelectedCommits: (commitIds: string[]) => void;
  setCurrentMode: (mode: 'edit' | 'preview' | 'diff') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 项目操作
  setProjectConfig: (config: ProjectConfig) => void;
  setProjectPath: (path: string) => void;
  
  // 重置状态
  reset: () => void;
}

const initialState: AppState = {
  currentDocument: '',
  isHistoryPanelOpen: false,
  isDiffViewOpen: false,
  selectedCommits: [],
  currentMode: 'edit',
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,
  projectConfig: null,
  projectPath: null,
  currentProject: null,
  documentManager: null,
  commits: [],

  // 文档初始化
  initializeDocument: (initialText: string = '', title: string = 'Untitled') => {
    const manager = new DocumentManager(initialText, title);
    set({
      documentManager: manager,
      currentDocument: manager.getCurrentDocument().getText(),
      commits: manager.getCommitHistory(),
    });
  },

  // 文档操作
  setCurrentDocument: (content: string) => {
    const { documentManager } = get();
    if (documentManager) {
      documentManager.updateDocument(content);
    }

    // 更新项目管理器中的内容
    ProjectManager.updateDocumentContent(content);

    set({ currentDocument: content });
  },

  // 项目管理
  loadProject: async (projectId: string) => {
    try {
      const project = await ProjectManager.loadAndSetProject(projectId);
      const manager = new DocumentManager(project.document_content, project.document_metadata.title);

      // 恢复提交历史
      for (const commit of project.commits) {
        const content = project.commit_data[commit.id] || '';
        // 这里需要将 Rust 的提交格式转换为前端格式
        // 暂时简化处理
      }

      set({
        currentProject: project,
        documentManager: manager,
        currentDocument: project.document_content,
        commits: project.commits.map(c => ({
          id: c.id,
          timestamp: new Date(c.timestamp).getTime(),
          message: c.message,
          isAutoCommit: c.is_auto_commit,
        })),
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  },

  saveProject: async () => {
    try {
      await ProjectManager.saveCurrentProject();
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  },

  // 版本管理
  createCommit: (message: string) => {
    const { documentManager } = get();
    if (documentManager) {
      documentManager.createCommit(message, false);
      set({ commits: documentManager.getCommitHistory() });
    }

    // 同时在项目管理器中添加提交
    ProjectManager.addCommit(message, false);
  },

  checkoutCommit: (commitId: string) => {
    const { documentManager } = get();
    if (documentManager) {
      const success = documentManager.checkoutCommit(commitId);
      if (success) {
        set({
          currentDocument: documentManager.getCurrentDocument().getText(),
          commits: documentManager.getCommitHistory(),
        });
      }
      return success;
    }
    return false;
  },

  refreshCommitHistory: () => {
    const { documentManager } = get();
    if (documentManager) {
      set({ commits: documentManager.getCommitHistory() });
    }
  },
  
  // 历史操作
  setCommits: (commits: CommitInfo[]) => 
    set({ commits }),
  
  addCommit: (commit: CommitInfo) => 
    set((state) => ({ 
      commits: [commit, ...state.commits] 
    })),
  
  // UI 状态操作
  setHistoryPanelOpen: (open: boolean) => 
    set({ isHistoryPanelOpen: open }),
  
  setDiffViewOpen: (open: boolean) => 
    set({ isDiffViewOpen: open }),
  
  setSelectedCommits: (commitIds: string[]) => 
    set({ selectedCommits: commitIds }),
  
  setCurrentMode: (mode: 'edit' | 'preview' | 'diff') => 
    set({ currentMode: mode }),
  
  setLoading: (loading: boolean) => 
    set({ isLoading: loading }),
  
  setError: (error: string | null) => 
    set({ error }),
  
  // 项目操作
  setProjectConfig: (config: ProjectConfig) => 
    set({ projectConfig: config }),
  
  setProjectPath: (path: string) => 
    set({ projectPath: path }),
  
  // 重置状态
  reset: () => {
    const { documentManager } = get();
    if (documentManager) {
      documentManager.destroy();
    }
    set({
      ...initialState,
      projectConfig: null,
      projectPath: null,
      documentManager: null,
      commits: [],
    });
  },
}));
