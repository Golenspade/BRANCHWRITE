import type { 
  TimelineNode, 
  TimelineConnection, 
  TimelineBranch, 
  TimelineData, 
  TimelineLayout,
  TimelineViewState,
  TimelineStats,
  TimelineSearchOptions,
  TimelineOperationResult
} from '../types/timeline';
import type { CommitInfo } from '../types/index';

/**
 * 时间线管理器 - 负责管理版本历史的时间线可视化
 */
export class TimelineManager {
  private nodes: Map<string, TimelineNode> = new Map();
  private connections: Map<string, TimelineConnection> = new Map();
  private branches: Map<string, TimelineBranch> = new Map();
  private layout: TimelineLayout;
  private viewState: TimelineViewState;

  constructor() {
    this.layout = this.getDefaultLayout();
    this.viewState = this.getDefaultViewState();
    this.initializeMainBranch();
  }

  /**
   * 从提交历史构建时间线
   */
  buildFromCommits(commits: CommitInfo[]): void {
    this.clear();
    this.initializeMainBranch();

    // 按时间排序提交
    const sortedCommits = [...commits].sort((a, b) => a.timestamp - b.timestamp);
    
    let previousNodeId: string | null = null;
    const mainBranch = this.branches.get('main')!;

    sortedCommits.forEach((commit, index) => {
      // 创建时间线节点
      const node: TimelineNode = {
        id: `node_${commit.id}`,
        type: 'commit',
        commitId: commit.id,
        timestamp: commit.timestamp,
        message: commit.message,
        isAutoCommit: commit.isAutoCommit,
        x: index * this.layout.nodeSpacing,
        y: 0,
        branchId: 'main',
        branchName: 'main',
        branchColor: mainBranch.color,
        tags: [],
        isMilestone: false,
      };

      this.nodes.set(node.id, node);

      // 创建连接线
      if (previousNodeId) {
        const connection: TimelineConnection = {
          id: `conn_${previousNodeId}_${node.id}`,
          fromNodeId: previousNodeId,
          toNodeId: node.id,
          type: 'linear',
          branchId: 'main',
          color: mainBranch.color,
        };
        this.connections.set(connection.id, connection);
      }

      previousNodeId = node.id;
    });

    // 更新布局
    this.updateLayout();
  }

  /**
   * 添加新的提交节点
   */
  addCommitNode(commit: CommitInfo, branchId: string = 'main'): string {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    // 创建新节点
    const nodeId = `node_${commit.id}`;
    const node: TimelineNode = {
      id: nodeId,
      type: 'commit',
      commitId: commit.id,
      timestamp: commit.timestamp,
      message: commit.message,
      isAutoCommit: commit.isAutoCommit,
      x: 0, // 将在 updateLayout 中计算
      y: 0,
      branchId,
      branchName: branch.name,
      branchColor: branch.color,
      tags: [],
      isMilestone: false,
    };

    this.nodes.set(nodeId, node);

    // 找到分支上的最后一个节点并创建连接
    const lastNodeInBranch = this.getLastNodeInBranch(branchId);
    if (lastNodeInBranch) {
      const connection: TimelineConnection = {
        id: `conn_${lastNodeInBranch.id}_${nodeId}`,
        fromNodeId: lastNodeInBranch.id,
        toNodeId: nodeId,
        type: 'linear',
        branchId,
        color: branch.color,
      };
      this.connections.set(connection.id, connection);
    }

    // 更新分支的结束节点
    branch.endNodeId = nodeId;

    this.updateLayout();
    return nodeId;
  }

  /**
   * 创建新分支
   */
  createBranch(
    name: string, 
    fromNodeId: string, 
    description?: string
  ): TimelineOperationResult {
    if (this.branches.has(name)) {
      return {
        success: false,
        message: `Branch ${name} already exists`,
      };
    }

    const fromNode = this.nodes.get(fromNodeId);
    if (!fromNode) {
      return {
        success: false,
        message: `Node ${fromNodeId} not found`,
      };
    }

    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const color = colors[this.branches.size % colors.length];

    const branch: TimelineBranch = {
      id: branchId,
      name,
      color,
      startNodeId: fromNodeId,
      isActive: true,
      description,
    };

    this.branches.set(branchId, branch);
    this.updateLayout();

    return {
      success: true,
      message: `Branch ${name} created successfully`,
      data: { branchId, branch },
    };
  }

  /**
   * 合并分支
   */
  mergeBranch(
    sourceBranchId: string, 
    targetBranchId: string, 
    mergeMessage: string
  ): TimelineOperationResult {
    const sourceBranch = this.branches.get(sourceBranchId);
    const targetBranch = this.branches.get(targetBranchId);

    if (!sourceBranch || !targetBranch) {
      return {
        success: false,
        message: 'Source or target branch not found',
      };
    }

    const sourceLastNode = this.getLastNodeInBranch(sourceBranchId);
    const targetLastNode = this.getLastNodeInBranch(targetBranchId);

    if (!sourceLastNode || !targetLastNode) {
      return {
        success: false,
        message: 'Cannot find last nodes in branches',
      };
    }

    // 创建合并节点
    const mergeNodeId = `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mergeNode: TimelineNode = {
      id: mergeNodeId,
      type: 'merge',
      commitId: '', // 合并节点可能没有对应的提交
      timestamp: Date.now(),
      message: mergeMessage,
      isAutoCommit: false,
      x: 0, // 将在 updateLayout 中计算
      y: 0,
      branchId: targetBranchId,
      branchName: targetBranch.name,
      branchColor: targetBranch.color,
      tags: ['merge'],
      isMilestone: true,
      milestoneTitle: `Merge ${sourceBranch.name} into ${targetBranch.name}`,
    };

    this.nodes.set(mergeNodeId, mergeNode);

    // 创建合并连接线
    const mergeConnection1: TimelineConnection = {
      id: `merge_conn_${targetLastNode.id}_${mergeNodeId}`,
      fromNodeId: targetLastNode.id,
      toNodeId: mergeNodeId,
      type: 'merge',
      branchId: targetBranchId,
      color: targetBranch.color,
    };

    const mergeConnection2: TimelineConnection = {
      id: `merge_conn_${sourceLastNode.id}_${mergeNodeId}`,
      fromNodeId: sourceLastNode.id,
      toNodeId: mergeNodeId,
      type: 'merge',
      branchId: sourceBranchId,
      color: sourceBranch.color,
    };

    this.connections.set(mergeConnection1.id, mergeConnection1);
    this.connections.set(mergeConnection2.id, mergeConnection2);

    // 标记源分支为已合并
    sourceBranch.isActive = false;
    sourceBranch.endNodeId = mergeNodeId;

    // 更新目标分支的结束节点
    targetBranch.endNodeId = mergeNodeId;

    this.updateLayout();

    return {
      success: true,
      message: `Successfully merged ${sourceBranch.name} into ${targetBranch.name}`,
      data: { mergeNodeId, mergeNode },
    };
  }

  /**
   * 获取时间线数据
   */
  getTimelineData(): TimelineData {
    return {
      nodes: Array.from(this.nodes.values()),
      connections: Array.from(this.connections.values()),
      branches: Array.from(this.branches.values()),
      layout: this.layout,
      metadata: {
        totalCommits: this.nodes.size,
        totalBranches: this.branches.size,
        timeSpan: this.getTimeSpan(),
        lastUpdated: Date.now(),
      },
    };
  }

  /**
   * 搜索时间线节点
   */
  search(options: TimelineSearchOptions): TimelineNode[] {
    const results: TimelineNode[] = [];
    const query = options.query.toLowerCase();

    for (const node of this.nodes.values()) {
      let matches = false;

      // 搜索消息
      if (options.searchIn.includes('message') && 
          node.message.toLowerCase().includes(query)) {
        matches = true;
      }

      // 搜索标签
      if (options.searchIn.includes('tags') && 
          node.tags?.some(tag => tag.toLowerCase().includes(query))) {
        matches = true;
      }

      // 搜索分支
      if (options.searchIn.includes('branch') && 
          node.branchName.toLowerCase().includes(query)) {
        matches = true;
      }

      // 日期范围过滤
      if (options.dateRange) {
        const nodeDate = new Date(node.timestamp);
        if (nodeDate < options.dateRange.start || nodeDate > options.dateRange.end) {
          matches = false;
        }
      }

      // 分支过滤
      if (options.branches && options.branches.length > 0) {
        if (!options.branches.includes(node.branchId)) {
          matches = false;
        }
      }

      // 节点类型过滤
      if (options.nodeTypes && options.nodeTypes.length > 0) {
        if (!options.nodeTypes.includes(node.type)) {
          matches = false;
        }
      }

      if (matches) {
        results.push(node);
      }
    }

    return results;
  }

  /**
   * 获取统计信息
   */
  getStats(): TimelineStats {
    const nodes = Array.from(this.nodes.values());
    const activeBranches = Array.from(this.branches.values()).filter(b => b.isActive);
    const mergedBranches = Array.from(this.branches.values()).filter(b => !b.isActive);

    // 计算每日平均提交数
    const timeSpan = this.getTimeSpan();
    const days = Math.max(1, Math.ceil(timeSpan / (24 * 60 * 60 * 1000)));
    const averageCommitsPerDay = nodes.length / days;

    // 找到最长的分支
    let longestBranch = { branchId: '', nodeCount: 0 };
    for (const branch of this.branches.values()) {
      const branchNodes = nodes.filter(n => n.branchId === branch.id);
      if (branchNodes.length > longestBranch.nodeCount) {
        longestBranch = { branchId: branch.id, nodeCount: branchNodes.length };
      }
    }

    // 找到最活跃的一天
    const dailyCommits = new Map<string, number>();
    nodes.forEach(node => {
      const date = new Date(node.timestamp).toDateString();
      dailyCommits.set(date, (dailyCommits.get(date) || 0) + 1);
    });

    let mostActiveDay = { date: '', commitCount: 0 };
    for (const [date, count] of dailyCommits.entries()) {
      if (count > mostActiveDay.commitCount) {
        mostActiveDay = { date, commitCount: count };
      }
    }

    // 字数进展（如果有的话）
    const wordCountProgression = nodes
      .filter(n => n.wordCount !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(n => ({
        timestamp: n.timestamp,
        wordCount: n.wordCount!,
      }));

    return {
      totalNodes: nodes.length,
      totalConnections: this.connections.size,
      activeBranches: activeBranches.length,
      mergedBranches: mergedBranches.length,
      averageCommitsPerDay,
      longestBranch,
      mostActiveDay,
      wordCountProgression,
    };
  }

  // 私有方法
  private getDefaultLayout(): TimelineLayout {
    return {
      nodeRadius: 8,
      nodeSpacing: 80,
      branchSpacing: 60,
      timeScale: 'linear',
      direction: 'horizontal',
      showGrid: true,
      showTimestamps: true,
    };
  }

  private getDefaultViewState(): TimelineViewState {
    return {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      selectedNodeIds: [],
      showBranchLabels: true,
      showCommitMessages: true,
      filterBranches: [],
    };
  }

  private initializeMainBranch(): void {
    const mainBranch: TimelineBranch = {
      id: 'main',
      name: 'main',
      color: '#3b82f6',
      startNodeId: '',
      isActive: true,
      description: 'Main development branch',
    };
    this.branches.set('main', mainBranch);
  }

  private clear(): void {
    this.nodes.clear();
    this.connections.clear();
    this.branches.clear();
  }

  private getLastNodeInBranch(branchId: string): TimelineNode | null {
    const branchNodes = Array.from(this.nodes.values())
      .filter(node => node.branchId === branchId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return branchNodes[0] || null;
  }

  private updateLayout(): void {
    // 这里实现布局算法
    // 简单的水平布局示例
    const nodesByBranch = new Map<string, TimelineNode[]>();
    
    // 按分支分组节点
    for (const node of this.nodes.values()) {
      if (!nodesByBranch.has(node.branchId)) {
        nodesByBranch.set(node.branchId, []);
      }
      nodesByBranch.get(node.branchId)!.push(node);
    }

    // 为每个分支计算位置
    let branchIndex = 0;
    for (const [branchId, nodes] of nodesByBranch.entries()) {
      const sortedNodes = nodes.sort((a, b) => a.timestamp - b.timestamp);
      
      sortedNodes.forEach((node, index) => {
        node.x = index * this.layout.nodeSpacing;
        node.y = branchIndex * this.layout.branchSpacing;
      });
      
      branchIndex++;
    }
  }

  private getTimeSpan(): number {
    const timestamps = Array.from(this.nodes.values()).map(n => n.timestamp);
    if (timestamps.length === 0) return 0;
    
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return max - min;
  }
}
