import React, { useState } from 'react';
import type { 
  TimelineViewState, 
  TimelineLayout, 
  TimelineSearchOptions,
  TimelineStats 
} from '../types/timeline';

interface TimelineControlsProps {
  viewState: TimelineViewState;
  layout: TimelineLayout;
  stats: TimelineStats;
  onViewStateChange: (viewState: TimelineViewState) => void;
  onLayoutChange: (layout: TimelineLayout) => void;
  onSearch: (options: TimelineSearchOptions) => void;
  onExport: () => void;
  onCreateBranch: () => void;
  onMergeBranch: () => void;
  onResetView: () => void;
}

export function TimelineControls({
  viewState,
  layout,
  stats,
  onViewStateChange,
  onLayoutChange,
  onSearch,
  onExport,
  onCreateBranch,
  onMergeBranch,
  onResetView,
}: TimelineControlsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // 处理搜索
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const searchOptions: TimelineSearchOptions = {
      query: searchQuery,
      searchIn: ['message', 'tags', 'branch'],
    };
    
    onSearch(searchOptions);
  };

  // 处理缩放
  const handleZoomChange = (zoom: number) => {
    onViewStateChange({
      ...viewState,
      zoom: Math.max(0.1, Math.min(3, zoom)),
    });
  };

  // 切换显示选项
  const toggleShowCommitMessages = () => {
    onViewStateChange({
      ...viewState,
      showCommitMessages: !viewState.showCommitMessages,
    });
  };

  const toggleShowBranchLabels = () => {
    onViewStateChange({
      ...viewState,
      showBranchLabels: !viewState.showBranchLabels,
    });
  };

  const toggleShowGrid = () => {
    onLayoutChange({
      ...layout,
      showGrid: !layout.showGrid,
    });
  };

  const toggleShowTimestamps = () => {
    onLayoutChange({
      ...layout,
      showTimestamps: !layout.showTimestamps,
    });
  };

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {/* 顶部工具栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        {/* 搜索区域 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="搜索提交、分支、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              width: '200px',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            搜索
          </button>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            ⚙️
          </button>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onCreateBranch}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            创建分支
          </button>
          <button
            onClick={onMergeBranch}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            合并分支
          </button>
          <button
            onClick={onExport}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            导出
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            统计
          </button>
        </div>
      </div>

      {/* 视图控制 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* 缩放控制 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>缩放:</span>
          <button
            onClick={() => handleZoomChange(viewState.zoom - 0.1)}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <span style={{ 
            fontSize: '0.875rem', 
            minWidth: '60px', 
            textAlign: 'center',
            color: '#4b5563',
          }}>
            {Math.round(viewState.zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoomChange(viewState.zoom + 0.1)}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            +
          </button>
          <button
            onClick={onResetView}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            重置
          </button>
        </div>

        {/* 显示选项 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={viewState.showCommitMessages}
              onChange={toggleShowCommitMessages}
            />
            显示提交消息
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={viewState.showBranchLabels}
              onChange={toggleShowBranchLabels}
            />
            显示分支标签
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={layout.showGrid}
              onChange={toggleShowGrid}
            />
            显示网格
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={layout.showTimestamps}
              onChange={toggleShowTimestamps}
            />
            显示时间戳
          </label>
        </div>
      </div>

      {/* 高级搜索面板 */}
      {showAdvancedSearch && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>
            高级搜索
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem' }}>
                搜索范围:
              </label>
              <select style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}>
                <option value="all">全部</option>
                <option value="message">提交消息</option>
                <option value="tags">标签</option>
                <option value="branch">分支</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem' }}>
                时间范围:
              </label>
              <input 
                type="date" 
                style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem' }}>
                分支过滤:
              </label>
              <select style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}>
                <option value="">所有分支</option>
                <option value="main">main</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 统计信息面板 */}
      {showStats && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>
            时间线统计
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.totalNodes}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>总提交数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                {stats.activeBranches}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>活跃分支</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {stats.mergedBranches}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>已合并分支</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                {stats.averageCommitsPerDay.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>日均提交</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
