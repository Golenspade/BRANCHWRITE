import { useState, useMemo } from 'react';
import type { CommitInfo } from '../types/index';
import type { DocumentManager } from '../models/DocumentManager';
import { VersionDetail } from './VersionDetail';

interface VersionManagerProps {
  documentManager: DocumentManager;
  onVersionSelect?: (commitId: string) => void;
  onVersionDiff?: (fromCommit: string, toCommit: string) => void;
}

export function VersionManager({ documentManager, onVersionSelect, onVersionDiff }: VersionManagerProps) {
  const commits = documentManager.getCommitHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'auto'>('all');
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCommitForDetail, setSelectedCommitForDetail] = useState<string>('');

  // 过滤和搜索版本
  const filteredCommits = useMemo(() => {
    return commits.filter(commit => {
      // 类型过滤
      if (filterType === 'manual' && commit.isAutoCommit) return false;
      if (filterType === 'auto' && !commit.isAutoCommit) return false;
      
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          commit.message.toLowerCase().includes(searchLower) ||
          commit.id.toLowerCase().includes(searchLower) ||
          new Date(commit.timestamp).toLocaleString().toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [commits, searchTerm, filterType]);

  const handleCommitSelect = (commitId: string, isMultiSelect: boolean = false) => {
    if (isMultiSelect) {
      setSelectedCommits(prev => 
        prev.includes(commitId) 
          ? prev.filter(id => id !== commitId)
          : [...prev, commitId]
      );
    } else {
      setSelectedCommits([commitId]);
      onVersionSelect?.(commitId);
    }
  };

  const handleBatchDelete = () => {
    if (selectedCommits.length === 0) return;
    
    const confirmMessage = `确定要删除选中的 ${selectedCommits.length} 个版本吗？\n\n注意：此操作不可撤销！`;
    if (confirm(confirmMessage)) {
      // TODO: 实现批量删除功能
      console.log('批量删除版本:', selectedCommits);
      setSelectedCommits([]);
    }
  };

  const handleExportVersions = () => {
    if (selectedCommits.length === 0) return;
    
    // TODO: 实现版本导出功能
    console.log('导出版本:', selectedCommits);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 搜索和过滤栏 */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="搜索版本..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          <button
            onClick={() => setSearchTerm('')}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#374151'}
            onMouseLeave={(e) => e.target.style.color = '#6b7280'}
          >
            清除
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'manual' | 'auto')}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          >
            <option value="all">所有版本</option>
            <option value="manual">手动保存</option>
            <option value="auto">自动保存</option>
          </select>

          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {filteredCommits.length} / {commits.length} 个版本
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedCommits.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem',
            backgroundColor: '#eff6ff',
            borderRadius: '0.375rem',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            <span style={{ fontSize: '0.875rem', color: '#1d4ed8' }}>
              已选择 {selectedCommits.length} 个版本
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleExportVersions}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#1d4ed8',
                  backgroundColor: '#dbeafe',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#bfdbfe'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dbeafe'}
              >
                导出
              </button>
              <button
                onClick={() => setSelectedCommits([])}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                取消选择
              </button>
              <button
                onClick={handleBatchDelete}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#b91c1c',
                  backgroundColor: '#fee2e2',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 版本列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredCommits.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
            {searchTerm || filterType !== 'all' ? (
              <div>
                <p>没有找到匹配的版本</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                  }}
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#2563eb',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#1d4ed8'}
                  onMouseLeave={(e) => e.target.style.color = '#2563eb'}
                >
                  清除筛选条件
                </button>
              </div>
            ) : (
              <div>
                <p>暂无版本历史</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>开始写作后会自动创建版本快照</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {filteredCommits.map((commit, index) => (
              <div
                key={commit.id}
                className={`history-item ${
                  selectedCommits.includes(commit.id) ? 'selected' : ''
                }`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleCommitSelect(commit.id, true);
                  } else {
                    if (confirm(`确定要切换到版本 "${commit.message}" 吗？\n\n注意：当前未保存的更改将会丢失。`)) {
                      try {
                        const success = documentManager.checkoutCommit(commit.id);
                        if (success) {
                          onVersionSelect?.(commit.id);
                          console.log('成功切换到版本:', commit.id);
                          // 清除选择状态，避免重复显示
                          setSelectedCommits([]);
                        } else {
                          alert('切换版本失败，请重试。');
                        }
                      } catch (error) {
                        console.error('版本切换错误:', error);
                        alert('切换版本时发生错误，请重试。');
                      }
                    }
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {/* 选择框 */}
                    <input
                      type="checkbox"
                      checked={selectedCommits.includes(commit.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCommitSelect(commit.id, true);
                      }}
                      style={{
                        marginTop: '0.25rem',
                        width: '1rem',
                        height: '1rem',
                        accentColor: '#3b82f6',
                        cursor: 'pointer'
                      }}
                    />

                    {/* 版本信息 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {commit.message}
                        </p>
                        {commit.isAutoCommit ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af'
                          }}>
                            自动
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: '#dcfce7',
                            color: '#166534'
                          }}>
                            手动
                          </span>
                        )}
                        {index === 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            当前
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        {formatTimestamp(commit.timestamp)}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        marginTop: '0.25rem'
                      }}>
                        ID: {commit.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{
                    flexShrink: 0,
                    marginLeft: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <button
                      style={{
                        fontSize: '0.75rem',
                        color: '#2563eb',
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        borderRadius: '0.25rem',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#1d4ed8'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#2563eb'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedCommits.length === 1) {
                          onVersionDiff?.(selectedCommits[0], commit.id);
                        } else {
                          alert('请先选择一个版本进行对比');
                        }
                      }}
                    >
                      对比
                    </button>
                    <button
                      style={{
                        fontSize: '0.75rem',
                        color: '#4b5563',
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        borderRadius: '0.25rem',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#374151'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#4b5563'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCommitForDetail(commit.id);
                        setIsDetailOpen(true);
                      }}
                    >
                      详情
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部统计信息 */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#4b5563'
        }}>
          <div>
            总版本: {commits.length} |
            手动: {commits.filter(c => !c.isAutoCommit).length} |
            自动: {commits.filter(c => c.isAutoCommit).length}
          </div>
          <div>
            {documentManager?.hasUnsavedChanges() ? (
              <span style={{ color: '#ea580c' }}>● 有未保存更改</span>
            ) : (
              <span style={{ color: '#16a34a' }}>● 已保存</span>
            )}
          </div>
        </div>
      </div>

      {/* 版本详情弹窗 */}
      <VersionDetail
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        commitId={selectedCommitForDetail}
      />
    </div>
  );
}
