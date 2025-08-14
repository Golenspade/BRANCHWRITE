import React, { useState, useEffect, useCallback } from 'react';
import { Timeline } from './Timeline';
import { TimelineControls } from './TimelineControls';
import { TimelineManager } from '../models/TimelineManager';
import type { DocumentManager } from '../models/DocumentManager';
import type { 
  TimelineData, 
  TimelineViewState, 
  TimelineEvent,
  TimelineSearchOptions 
} from '../types/timeline';

interface TimelineViewProps {
  documentManager: DocumentManager;
  isOpen: boolean;
  onClose: () => void;
}

export function TimelineView({ documentManager, isOpen, onClose }: TimelineViewProps) {
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

  // 初始化时间线数据
  useEffect(() => {
    if (isOpen) {
      const commits = documentManager.getCommitHistory();
      timelineManager.buildFromCommits(commits);
      setTimelineData(timelineManager.getTimelineData());
    }
  }, [isOpen, documentManager, timelineManager]);

  // 监听文档管理器的变化
  useEffect(() => {
    const handleDocumentChange = () => {
      if (isOpen) {
        const commits = documentManager.getCommitHistory();
        timelineManager.buildFromCommits(commits);
        setTimelineData(timelineManager.getTimelineData());
      }
    };

    // 这里应该监听 documentManager 的变化事件
    // 暂时使用定时器模拟
    const interval = setInterval(handleDocumentChange, 5000);
    
    return () => clearInterval(interval);
  }, [isOpen, documentManager, timelineManager]);

  // 处理节点点击
  const handleNodeClick = useCallback((nodeId: string, event: TimelineEvent) => {
    const node = timelineData?.nodes.find(n => n.id === nodeId);
    if (!node) return;

    console.log('Timeline: 节点点击', { nodeId, node, event });
    
    // 可以在这里添加更多的交互逻辑
    // 比如显示节点详情、切换到该版本等
  }, [timelineData]);

  // 处理节点双击
  const handleNodeDoubleClick = useCallback((nodeId: string, event: TimelineEvent) => {
    const node = timelineData?.nodes.find(n => n.id === nodeId);
    if (!node) return;

    console.log('Timeline: 节点双击', { nodeId, node });
    
    // 双击切换到该版本
    if (confirm(`确定要切换到版本 "${node.message}" 吗？`)) {
      try {
        const success = documentManager.checkoutCommit(node.commitId);
        if (success) {
          console.log('成功切换到版本:', node.commitId);
          // 可以触发界面更新
        } else {
          alert('切换版本失败，请重试。');
        }
      } catch (error) {
        console.error('版本切换错误:', error);
        alert('切换版本时发生错误，请重试。');
      }
    }
  }, [timelineData, documentManager]);

  // 处理搜索
  const handleSearch = useCallback((options: TimelineSearchOptions) => {
    if (!timelineData) return;
    
    const results = timelineManager.search(options);
    console.log('Timeline: 搜索结果', results);
    
    // 高亮搜索结果
    const resultIds = results.map(node => node.id);
    setViewState(prev => ({
      ...prev,
      selectedNodeIds: resultIds,
    }));
  }, [timelineManager, timelineData]);

  // 处理导出
  const handleExport = useCallback(() => {
    if (!timelineData) return;
    
    // 简单的 JSON 导出
    const exportData = {
      timeline: timelineData,
      exportTime: new Date().toISOString(),
      stats: timelineManager.getStats(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timelineData, timelineManager]);

  // 处理创建分支
  const handleCreateBranch = useCallback(() => {
    if (viewState.selectedNodeIds.length !== 1) {
      alert('请先选择一个节点作为分支起点');
      return;
    }

    const branchName = prompt('请输入分支名称:');
    if (!branchName) return;

    const fromNodeId = viewState.selectedNodeIds[0];
    const result = timelineManager.createBranch(branchName, fromNodeId);
    
    if (result.success) {
      setTimelineData(timelineManager.getTimelineData());
      console.log('分支创建成功:', result);
    } else {
      alert(result.message);
    }
  }, [viewState.selectedNodeIds, timelineManager]);

  // 处理合并分支
  const handleMergeBranch = useCallback(() => {
    // 这里需要更复杂的 UI 来选择源分支和目标分支
    // 暂时使用简单的 prompt
    const sourceBranch = prompt('请输入源分支名称:');
    const targetBranch = prompt('请输入目标分支名称:', 'main');
    const mergeMessage = prompt('请输入合并消息:', `Merge ${sourceBranch} into ${targetBranch}`);
    
    if (!sourceBranch || !targetBranch || !mergeMessage) return;

    const result = timelineManager.mergeBranch(sourceBranch, targetBranch, mergeMessage);
    
    if (result.success) {
      setTimelineData(timelineManager.getTimelineData());
      console.log('分支合并成功:', result);
    } else {
      alert(result.message);
    }
  }, [timelineManager]);

  // 重置视图
  const handleResetView = useCallback(() => {
    setViewState({
      zoom: 1,
      offsetX: 50,
      offsetY: 50,
      selectedNodeIds: [],
      showBranchLabels: true,
      showCommitMessages: true,
      filterBranches: [],
    });
  }, []);

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
        width: '90vw',
        height: '90vh',
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
            📈 版本时间线
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
            width={window.innerWidth * 0.9}
            height={window.innerHeight * 0.9 - 200} // 减去标题栏和控制面板的高度
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
            节点: {timelineData.nodes.length} | 
            连接: {timelineData.connections.length} | 
            分支: {timelineData.branches.length}
          </div>
          <div>
            缩放: {Math.round(viewState.zoom * 100)}% | 
            选中: {viewState.selectedNodeIds.length}
          </div>
        </div>
      </div>
    </div>
  );
}
