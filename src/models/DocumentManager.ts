import { Document } from './Document';
import type { Commit, CommitInfo } from '../types/index';

/**
 * 文档管理器 - 负责管理文档的版本历史和状态
 */
export class DocumentManager {
  private currentDocument: Document;
  private commits: Map<string, Commit> = new Map();
  private commitHistory: string[] = []; // 按时间顺序存储 commit ID
  private autoCommitTimer: NodeJS.Timeout | null = null;
  private lastAutoCommitHash: string = '';

  constructor(initialText: string = '', title: string = 'Untitled') {
    this.currentDocument = new Document(initialText, title);
    
    // 创建初始提交
    this.createCommit('初始版本', true);
  }

  /**
   * 获取当前文档
   */
  getCurrentDocument(): Document {
    return this.currentDocument;
  }

  /**
   * 更新文档内容
   */
  updateDocument(text: string): void {
    this.currentDocument.setText(text);
  }

  /**
   * 创建一个新的提交
   */
  createCommit(message: string, isAutoCommit: boolean = false): string {
    const commitId = this.generateCommitId();
    const timestamp = Date.now();
    
    const commit: Commit = {
      id: commitId,
      timestamp,
      message,
      documentState: this.currentDocument.getState(),
      isAutoCommit,
    };

    this.commits.set(commitId, commit);
    this.commitHistory.unshift(commitId); // 最新的在前面
    
    // 更新自动提交哈希
    this.lastAutoCommitHash = this.currentDocument.getHash();

    return commitId;
  }

  /**
   * 获取提交历史信息
   */
  getCommitHistory(): CommitInfo[] {
    return this.commitHistory.map(id => {
      const commit = this.commits.get(id)!;
      return {
        id: commit.id,
        timestamp: commit.timestamp,
        message: commit.message,
        isAutoCommit: commit.isAutoCommit,
      };
    });
  }

  /**
   * 根据提交ID获取文档状态
   */
  getDocumentAtCommit(commitId: string): Document | null {
    const commit = this.commits.get(commitId);
    if (!commit) {
      return null;
    }

    const doc = new Document();
    try {
      doc.loadState(commit.documentState);
      return doc;
    } catch (error) {
      console.error('Failed to load document at commit:', error);
      return null;
    }
  }

  /**
   * 切换到指定的提交
   */
  checkoutCommit(commitId: string): boolean {
    const targetDoc = this.getDocumentAtCommit(commitId);
    if (!targetDoc) {
      return false;
    }

    // 只有在有实质性更改时才创建自动提交
    if (this.hasUnsavedChanges()) {
      const currentText = this.currentDocument.getText();
      const currentWordCount = currentText.trim().split(/\s+/).filter(word => word.length > 0).length;

      // 获取最后一次提交的字数
      let lastWordCount = 0;
      if (this.commitHistory.length > 0) {
        const lastCommit = this.commitHistory[this.commitHistory.length - 1];
        const lastDoc = this.getDocumentAtCommit(lastCommit.id);
        if (lastDoc) {
          const lastText = lastDoc.getText();
          lastWordCount = lastText.trim().split(/\s+/).filter(word => word.length > 0).length;
        }
      }

      // 只有当字数变化超过10个字时才自动保存
      if (Math.abs(currentWordCount - lastWordCount) > 10) {
        this.createCommit('自动保存 - 切换版本前', true);
      }
    }

    // 切换到目标版本
    this.currentDocument = targetDoc.clone();

    // 更新最后提交哈希，避免误判为未保存状态
    this.lastAutoCommitHash = this.currentDocument.getHash();

    return true;
  }

  /**
   * 检查是否有未保存的更改
   */
  hasUnsavedChanges(): boolean {
    const currentHash = this.currentDocument.getHash();
    return currentHash !== this.lastAutoCommitHash;
  }

  /**
   * 启动自动提交
   */
  startAutoCommit(intervalMinutes: number = 5, wordCountThreshold: number = 100): void {
    this.stopAutoCommit(); // 先停止现有的定时器

    this.autoCommitTimer = setInterval(() => {
      if (this.shouldAutoCommit(wordCountThreshold)) {
        const stats = this.currentDocument.getStats();
        const message = `自动保存 - ${stats.words} 字`;
        this.createCommit(message, true);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 停止自动提交
   */
  stopAutoCommit(): void {
    if (this.autoCommitTimer) {
      clearInterval(this.autoCommitTimer);
      this.autoCommitTimer = null;
    }
  }

  /**
   * 判断是否应该进行自动提交
   */
  private shouldAutoCommit(wordCountThreshold: number): boolean {
    if (!this.hasUnsavedChanges()) {
      return false;
    }

    const stats = this.currentDocument.getStats();
    const lastCommitStats = this.getLastCommitStats();
    
    // 如果字数增加超过阈值，则自动提交
    return stats.words - lastCommitStats.words >= wordCountThreshold;
  }

  /**
   * 获取最后一次提交的统计信息
   */
  private getLastCommitStats() {
    if (this.commitHistory.length === 0) {
      return { words: 0, characters: 0, lines: 0 };
    }

    const lastCommitId = this.commitHistory[0];
    const lastDoc = this.getDocumentAtCommit(lastCommitId);
    return lastDoc ? lastDoc.getStats() : { words: 0, characters: 0, lines: 0 };
  }

  /**
   * 生成唯一的提交ID
   */
  private generateCommitId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * 获取两个提交之间的差异
   */
  getDiff(fromCommitId: string, toCommitId: string): { oldDoc: Document; newDoc: Document } | null {
    const oldDoc = this.getDocumentAtCommit(fromCommitId);
    const newDoc = this.getDocumentAtCommit(toCommitId);
    
    if (!oldDoc || !newDoc) {
      return null;
    }

    return { oldDoc, newDoc };
  }

  /**
   * 清理旧的提交（保留最近的N个）
   */
  cleanupOldCommits(keepCount: number = 50): void {
    if (this.commitHistory.length <= keepCount) {
      return;
    }

    const toRemove = this.commitHistory.slice(keepCount);
    toRemove.forEach(id => {
      this.commits.delete(id);
    });
    
    this.commitHistory = this.commitHistory.slice(0, keepCount);
  }

  /**
   * 导出所有数据
   */
  exportData() {
    return {
      currentDocument: this.currentDocument.getState(),
      commits: Array.from(this.commits.entries()),
      commitHistory: this.commitHistory,
      metadata: this.currentDocument.getMetadata(),
    };
  }

  /**
   * 导入数据
   */
  importData(data: any): boolean {
    try {
      // 恢复当前文档
      this.currentDocument = new Document();
      this.currentDocument.loadState(data.currentDocument);

      // 恢复提交历史
      this.commits.clear();
      data.commits.forEach(([id, commit]: [string, Commit]) => {
        this.commits.set(id, commit);
      });
      
      this.commitHistory = data.commitHistory;
      this.lastAutoCommitHash = this.currentDocument.getHash();

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopAutoCommit();
    this.commits.clear();
    this.commitHistory = [];
  }
}
