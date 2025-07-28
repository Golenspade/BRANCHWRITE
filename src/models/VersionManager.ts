import { Commit, CommitInfo, DiffResult } from '../types';
import { Document } from './Document';
import { DiffEngine } from './DiffEngine';

export class VersionManager {
  private commits: Commit[] = [];
  private document: Document;
  private diffEngine: DiffEngine;
  private autoCommitTimer: NodeJS.Timeout | null = null;
  private lastAutoCommitTime: number = 0;
  private autoCommitInterval: number = 10 * 60 * 1000; // 10分钟
  private autoCommitWordThreshold: number = 100; // 100字
  private lastWordCount: number = 0;

  constructor(document: Document) {
    this.document = document;
    this.diffEngine = new DiffEngine();
    this.setupAutoCommit();
  }

  /**
   * 创建新的提交
   */
  async createCommit(message?: string, isAutoCommit: boolean = false): Promise<string> {
    const commitId = this.generateCommitId();
    const commit: Commit = {
      id: commitId,
      timestamp: Date.now(),
      message: message || (isAutoCommit ? 'Auto commit' : 'Manual commit'),
      documentState: this.document.getState(),
      isAutoCommit,
    };

    this.commits.unshift(commit); // 最新的提交在前面
    this.lastAutoCommitTime = Date.now();
    this.lastWordCount = this.document.getStats().words;

    // 这里应该调用存储服务保存历史记录
    await this.saveHistory();

    return commitId;
  }

  /**
   * 获取历史提交列表
   */
  getHistoryList(): CommitInfo[] {
    return this.commits.map(commit => ({
      id: commit.id,
      timestamp: commit.timestamp,
      message: commit.message,
      isAutoCommit: commit.isAutoCommit,
    }));
  }

  /**
   * 获取指定提交的详细信息
   */
  async getCommit(commitId: string): Promise<Commit | null> {
    return this.commits.find(commit => commit.id === commitId) || null;
  }

  /**
   * 比较两个版本的差异
   */
  async compare(commitIdA: string, commitIdB: string): Promise<DiffResult> {
    const commitA = await this.getCommit(commitIdA);
    const commitB = await this.getCommit(commitIdB);

    if (!commitA || !commitB) {
      throw new Error('Commit not found');
    }

    const textA = this.getTextFromState(commitA.documentState);
    const textB = this.getTextFromState(commitB.documentState);

    return this.diffEngine.diff(textA, textB);
  }

  /**
   * 检出到指定版本（只读预览）
   */
  async checkout(commitId: string): Promise<string> {
    const commit = await this.getCommit(commitId);
    if (!commit) {
      throw new Error('Commit not found');
    }

    return this.getTextFromState(commit.documentState);
  }

  /**
   * 回滚到指定版本
   */
  async rollback(commitId: string): Promise<void> {
    const commit = await this.getCommit(commitId);
    if (!commit) {
      throw new Error('Commit not found');
    }

    // 加载指定版本的状态
    this.document.loadState(commit.documentState);
    
    // 创建一个新的提交记录回滚操作
    await this.createCommit(`Rollback to ${commit.message}`, false);
  }

  /**
   * 从状态数据获取文本内容
   */
  private getTextFromState(stateData: Uint8Array): string {
    const tempDoc = new Document();
    tempDoc.loadState(stateData);
    return tempDoc.getText();
  }

  /**
   * 生成提交ID
   */
  private generateCommitId(): string {
    return `commit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置自动提交
   */
  private setupAutoCommit(): void {
    // 监听文档变更
    this.document.addChangeListener(() => {
      this.checkAutoCommit();
    });

    // 定时检查
    this.autoCommitTimer = setInterval(() => {
      this.checkAutoCommit();
    }, 60000); // 每分钟检查一次
  }

  /**
   * 检查是否需要自动提交
   */
  private checkAutoCommit(): void {
    const now = Date.now();
    const timeSinceLastCommit = now - this.lastAutoCommitTime;
    const currentWordCount = this.document.getStats().words;
    const wordCountDiff = currentWordCount - this.lastWordCount;

    // 时间间隔或字数变化达到阈值时自动提交
    if (
      timeSinceLastCommit >= this.autoCommitInterval ||
      wordCountDiff >= this.autoCommitWordThreshold
    ) {
      this.createCommit(undefined, true);
    }
  }

  /**
   * 设置自动提交参数
   */
  setAutoCommitConfig(intervalMinutes: number, wordThreshold: number): void {
    this.autoCommitInterval = intervalMinutes * 60 * 1000;
    this.autoCommitWordThreshold = wordThreshold;
  }

  /**
   * 保存历史记录到存储
   */
  private async saveHistory(): Promise<void> {
    // 这里应该调用 Tauri 命令保存到文件
    // 暂时只是占位符
    console.log('Saving history...', this.commits.length, 'commits');
  }

  /**
   * 从存储加载历史记录
   */
  async loadHistory(historyData: string): Promise<void> {
    try {
      const data = JSON.parse(historyData);
      this.commits = data.commits || [];
      
      if (this.commits.length > 0) {
        this.lastAutoCommitTime = this.commits[0].timestamp;
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      this.commits = [];
    }
  }

  /**
   * 获取序列化的历史数据
   */
  getSerializedHistory(): string {
    return JSON.stringify({
      commits: this.commits,
      version: '1.0.0',
      lastModified: Date.now(),
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.autoCommitTimer) {
      clearInterval(this.autoCommitTimer);
      this.autoCommitTimer = null;
    }
  }
}
