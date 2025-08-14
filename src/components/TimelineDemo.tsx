import React, { useState, useEffect } from 'react';
import { Timeline } from './Timeline';
import { TimelineControls } from './TimelineControls';
import { TimelineManager } from '../models/TimelineManager';
import type { 
  TimelineData, 
  TimelineViewState, 
  TimelineEvent 
} from '../types/timeline';
import type { CommitInfo } from '../types/index';

interface TimelineDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimelineDemo({ isOpen, onClose }: TimelineDemoProps) {
  const [timelineManager] = useState(() => new TimelineManager());
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [viewState, setViewState] = useState<TimelineViewState>({
    zoom: 1,
    offsetX: 50,
    offsetY: 50,
    selectedNodeIds: [],
    showBranchLabels: true,
    showCommitMessages: true,
    filterBranches: [],
  });

  // 初始化演示数据
  useEffect(() => {
    if (isOpen) {
      createDemoData();
    }
  }, [isOpen]);

  const createDemoData = () => {
    console.log('🎬 创建时间线演示数据...');
    
    // 创建模拟的提交历史
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    
    const demoCommits: CommitInfo[] = [
      {
        id: 'commit_1',
        timestamp: now - 7 * day,
        message: '项目初始化',
        isAutoCommit: false,
      },
      {
        id: 'commit_2',
        timestamp: now - 6 * day,
        message: '添加基础框架',
        isAutoCommit: false,
      },
      {
        id: 'commit_3',
        timestamp: now - 5 * day + 2 * hour,
        message: '实现用户认证',
        isAutoCommit: false,
      },
      {
        id: 'commit_4',
        timestamp: now - 5 * day + 4 * hour,
        message: '自动保存',
        isAutoCommit: true,
      },
      {
        id: 'commit_5',
        timestamp: now - 4 * day,
        message: '添加数据库模型',
        isAutoCommit: false,
      },
      {
        id: 'commit_6',
        timestamp: now - 3 * day + 3 * hour,
        message: '实现API接口',
        isAutoCommit: false,
      },
      {
        id: 'commit_7',
        timestamp: now - 3 * day + 6 * hour,
        message: '自动保存',
        isAutoCommit: true,
      },
      {
        id: 'commit_8',
        timestamp: now - 2 * day,
        message: '添加前端界面',
        isAutoCommit: false,
      },
      {
        id: 'commit_9',
        timestamp: now - 1 * day + 2 * hour,
        message: '修复登录bug',
        isAutoCommit: false,
      },
      {
        id: 'commit_10',
        timestamp: now - 1 * day + 5 * hour,
        message: '优化性能',
        isAutoCommit: false,
      },
      {
        id: 'commit_11',
        timestamp: now - 6 * hour,
        message: '添加测试用例',
        isAutoCommit: false,
      },
      {
        id: 'commit_12',
        timestamp: now - 2 * hour,
        message: '准备发布',
        isAutoCommit: false,
      },
    ];

    // 构建时间线
    timelineManager.buildFromCommits(demoCommits);
    
    // 创建一个功能分支
    const branchPoint = timelineManager.getTimelineData().nodes[4]; // 从第5个提交创建分支
    if (branchPoint) {
      const branchResult = timelineManager.createBranch('feature/ui-redesign', branchPoint.id, 'UI重设计分支');
      
      if (branchResult.success) {
        // 在分支上添加一些提交
        const branchCommits: CommitInfo[] = [
          {
            id: 'branch_commit_1',
            timestamp: now - 3 * day + 1 * hour,
            message: '重设计主页面',
            isAutoCommit: false,
          },
          {
            id: 'branch_commit_2',
            timestamp: now - 2 * day + 3 * hour,
            message: '优化用户体验',
            isAutoCommit: false,
          },
          {
            id: 'branch_commit_3',
            timestamp: now - 1 * day + 1 * hour,
            message: '添加动画效果',
            isAutoCommit: false,
          },
        ];

        const branchId = branchResult.data.branchId;
        branchCommits.forEach(commit => {
          timelineManager.addCommitNode(commit, branchId);
        });

        // 合并分支
        timelineManager.mergeBranch(branchId, 'main', '合并UI重设计功能');
      }
    }

    // 创建另一个分支用于演示
    const secondBranchPoint = timelineManager.getTimelineData().nodes[7]; // 从第8个提交创建分支
    if (secondBranchPoint) {
      const hotfixResult = timelineManager.createBranch('hotfix/critical-bug', secondBranchPoint.id, '紧急修复分支');
      
      if (hotfixResult.success) {
        const hotfixCommit: CommitInfo = {
          id: 'hotfix_commit_1',
          timestamp: now - 1 * day + 3 * hour,
          message: '修复关键安全漏洞',
          isAutoCommit: false,
        };

        timelineManager.addCommitNode(hotfixCommit, hotfixResult.data.branchId);
        
        // 这个分支暂时不合并，用于演示活跃分支
      }
    }

    setTimelineData(timelineManager.getTimelineData());
    console.log('✅ 演示数据创建完成');
  };

  const handleNodeClick = (nodeId: string, event: TimelineEvent) => {
    console.log('🎯 节点点击:', { nodeId, event });
  };

  const handleNodeDoubleClick = (nodeId: string, event: TimelineEvent) => {
    console.log('🎯 节点双击:', { nodeId, event });
    const node = timelineData?.nodes.find(n => n.id === nodeId);
    if (node) {
      alert(`版本详情:\n\n提交ID: ${node.commitId}\n消息: ${node.message}\n时间: ${new Date(node.timestamp).toLocaleString()}\n分支: ${node.branchName}`);
    }
  };

  const handleSearch = (options: any) => {
    console.log('🔍 搜索:', options);
    if (timelineData) {
      const results = timelineManager.search(options);
      const resultIds = results.map(node => node.id);
      setViewState(prev => ({
        ...prev,
        selectedNodeIds: resultIds,
      }));
    }
  };

  const handleExport = () => {
    console.log('📤 导出时间线');
    if (timelineData) {
      const exportData = {
        timeline: timelineData,
        stats: timelineManager.getStats(),
        exportTime: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline-demo-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCreateBranch = () => {
    if (viewState.selectedNodeIds.length !== 1) {
      alert('请先选择一个节点作为分支起点');
      return;
    }

    const branchName = prompt('请输入分支名称:', 'feature/new-feature');
    if (!branchName) return;

    const fromNodeId = viewState.selectedNodeIds[0];
    const result = timelineManager.createBranch(branchName, fromNodeId);
    
    if (result.success) {
      setTimelineData(timelineManager.getTimelineData());
      console.log('✅ 分支创建成功:', result);
    } else {
      alert(result.message);
    }
  };

  const handleMergeBranch = () => {
    const branches = timelineData?.branches.filter(b => b.isActive && b.name !== 'main') || [];
    if (branches.length === 0) {
      alert('没有可合并的分支');
      return;
    }

    const branchNames = branches.map(b => b.name).join('\n');
    const sourceBranch = prompt(`请选择要合并的分支:\n\n${branchNames}\n\n请输入分支名称:`);
    if (!sourceBranch) return;

    const targetBranch = 'main';
    const mergeMessage = `合并 ${sourceBranch} 到 ${targetBranch}`;

    const result = timelineManager.mergeBranch(sourceBranch, targetBranch, mergeMessage);
    
    if (result.success) {
      setTimelineData(timelineManager.getTimelineData());
      console.log('✅ 分支合并成功:', result);
    } else {
      alert(result.message);
    }
  };

  const handleResetView = () => {
    setViewState({
      zoom: 1,
      offsetX: 50,
      offsetY: 50,
      selectedNodeIds: [],
      showBranchLabels: true,
      showCommitMessages: true,
      filterBranches: [],
    });
  };

  if (!isOpen || !timelineData) {
    return null;
  }

  const stats = timelineManager.getStats();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '95vw',
        height: '95vh',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 标题栏 */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f9fafb',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
            📈 时间线演示 - 交互式版本历史可视化
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              borderRadius: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* 控制面板 */}
        <TimelineControls
          viewState={viewState}
          layout={timelineData.layout}
          stats={stats}
          onViewStateChange={setViewState}
          onLayoutChange={(layout) => {
            setTimelineData(prev => prev ? { ...prev, layout } : null);
          }}
          onSearch={handleSearch}
          onExport={handleExport}
          onCreateBranch={handleCreateBranch}
          onMergeBranch={handleMergeBranch}
          onResetView={handleResetView}
        />

        {/* 时间线主体 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Timeline
            data={timelineData}
            viewState={viewState}
            onViewStateChange={setViewState}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            width={window.innerWidth * 0.95}
            height={window.innerHeight * 0.95 - 200}
          />
        </div>

        {/* 状态栏 */}
        <div style={{
          padding: '0.5rem 1rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          fontSize: '0.875rem',
          color: '#6b7280',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <div>
            📊 节点: {timelineData.nodes.length} | 
            连接: {timelineData.connections.length} | 
            分支: {timelineData.branches.length} ({stats.activeBranches} 活跃)
          </div>
          <div>
            🔍 缩放: {Math.round(viewState.zoom * 100)}% | 
            选中: {viewState.selectedNodeIds.length} | 
            💡 双击节点查看详情
          </div>
        </div>
      </div>
    </div>
  );
}
