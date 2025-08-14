/**
 * 时间线相关类型定义
 */

// 时间线节点类型
export type TimelineNodeType = 'commit' | 'branch' | 'merge' | 'milestone';

// 时间线节点
export interface TimelineNode {
  id: string;
  type: TimelineNodeType;
  commitId: string;
  timestamp: number;
  message: string;
  isAutoCommit: boolean;
  
  // 位置信息
  x: number;
  y: number;
  
  // 分支信息
  branchId: string;
  branchName: string;
  branchColor: string;
  
  // 统计信息
  wordCount?: number;
  characterCount?: number;
  
  // 标签和里程碑
  tags?: string[];
  isMilestone?: boolean;
  milestoneTitle?: string;
}

// 时间线连接线
export interface TimelineConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'linear' | 'branch' | 'merge';
  branchId: string;
  color: string;
}

// 分支信息
export interface TimelineBranch {
  id: string;
  name: string;
  color: string;
  startNodeId: string;
  endNodeId?: string; // 如果分支已合并
  isActive: boolean;
  description?: string;
}

// 时间线布局配置
export interface TimelineLayout {
  nodeRadius: number;
  nodeSpacing: number;
  branchSpacing: number;
  timeScale: 'linear' | 'logarithmic';
  direction: 'horizontal' | 'vertical';
  showGrid: boolean;
  showTimestamps: boolean;
}

// 时间线视图状态
export interface TimelineViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  selectedNodeIds: string[];
  hoveredNodeId?: string;
  showBranchLabels: boolean;
  showCommitMessages: boolean;
  filterBranches: string[];
  timeRange?: {
    start: number;
    end: number;
  };
}

// 时间线操作事件
export interface TimelineEvent {
  type: 'node-click' | 'node-double-click' | 'node-hover' | 'connection-click' | 'background-click';
  nodeId?: string;
  connectionId?: string;
  position: { x: number; y: number };
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

// 时间线数据
export interface TimelineData {
  nodes: TimelineNode[];
  connections: TimelineConnection[];
  branches: TimelineBranch[];
  layout: TimelineLayout;
  metadata: {
    totalCommits: number;
    totalBranches: number;
    timeSpan: number;
    lastUpdated: number;
  };
}

// 时间线操作结果
export interface TimelineOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

// 时间线搜索选项
export interface TimelineSearchOptions {
  query: string;
  searchIn: ('message' | 'tags' | 'branch')[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  branches?: string[];
  nodeTypes?: TimelineNodeType[];
}

// 时间线导出选项
export interface TimelineExportOptions {
  format: 'svg' | 'png' | 'pdf' | 'json';
  includeMetadata: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  branches?: string[];
  resolution?: {
    width: number;
    height: number;
  };
}

// 时间线统计信息
export interface TimelineStats {
  totalNodes: number;
  totalConnections: number;
  activeBranches: number;
  mergedBranches: number;
  averageCommitsPerDay: number;
  longestBranch: {
    branchId: string;
    nodeCount: number;
  };
  mostActiveDay: {
    date: string;
    commitCount: number;
  };
  wordCountProgression: Array<{
    timestamp: number;
    wordCount: number;
  }>;
}
