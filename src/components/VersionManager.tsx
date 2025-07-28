import { useState, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { CommitInfo } from '../types';
import { VersionDetail } from './VersionDetail';

interface VersionManagerProps {
  onVersionSelect?: (commitId: string) => void;
  onVersionCompare?: (commitId: string) => void;
}

export function VersionManager({ onVersionSelect, onVersionCompare }: VersionManagerProps) {
  const { commits, checkoutCommit, documentManager } = useAppStore();
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
    <div className="flex flex-col h-full">
      {/* 搜索和过滤栏 */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="搜索版本..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setSearchTerm('')}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            清除
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'manual' | 'auto')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有版本</option>
            <option value="manual">手动保存</option>
            <option value="auto">自动保存</option>
          </select>
          
          <div className="text-sm text-gray-500">
            {filteredCommits.length} / {commits.length} 个版本
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedCommits.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-700">
              已选择 {selectedCommits.length} 个版本
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportVersions}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
              >
                导出
              </button>
              <button
                onClick={() => setSelectedCommits([])}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                取消选择
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 版本列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredCommits.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm || filterType !== 'all' ? (
              <div>
                <p>没有找到匹配的版本</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  清除筛选条件
                </button>
              </div>
            ) : (
              <div>
                <p>暂无版本历史</p>
                <p className="text-sm mt-2">开始写作后会自动创建版本快照</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCommits.map((commit, index) => (
              <div
                key={commit.id}
                className={`history-item relative ${
                  selectedCommits.includes(commit.id) ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleCommitSelect(commit.id, true);
                  } else {
                    if (confirm(`确定要切换到版本 "${commit.message}" 吗？\n\n注意：当前未保存的更改将会丢失。`)) {
                      const success = checkoutCommit(commit.id);
                      if (success) {
                        console.log('成功切换到版本:', commit.id);
                      } else {
                        alert('切换版本失败，请重试。');
                      }
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {/* 选择框 */}
                    <input
                      type="checkbox"
                      checked={selectedCommits.includes(commit.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCommitSelect(commit.id, true);
                      }}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    
                    {/* 版本信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {commit.message}
                        </p>
                        {commit.isAutoCommit ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            自动
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            手动
                          </span>
                        )}
                        {index === 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(commit.timestamp)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        ID: {commit.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVersionCompare?.(commit.id);
                      }}
                    >
                      对比
                    </button>
                    <button
                      className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1"
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
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            总版本: {commits.length} | 
            手动: {commits.filter(c => !c.isAutoCommit).length} | 
            自动: {commits.filter(c => c.isAutoCommit).length}
          </div>
          <div>
            {documentManager?.hasUnsavedChanges() ? (
              <span className="text-orange-600">● 有未保存更改</span>
            ) : (
              <span className="text-green-600">● 已保存</span>
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
