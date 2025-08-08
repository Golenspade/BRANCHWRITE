import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import type { CommitInfo } from '../types/index';

interface VersionDetailProps {
  isOpen: boolean;
  onClose: () => void;
  commitId: string;
}

export function VersionDetail({ isOpen, onClose, commitId }: VersionDetailProps) {
  const { documentManager, commits } = useAppStore();
  const [commitInfo, setCommitInfo] = useState<CommitInfo | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [documentStats, setDocumentStats] = useState<{
    characters: number;
    words: number;
    lines: number;
    paragraphs: number;
  } | null>(null);

  useEffect(() => {
    if (commitId && documentManager) {
      // 获取提交信息
      const commit = commits.find(c => c.id === commitId);
      if (commit) {
        setCommitInfo(commit);
      }

      // 获取文档内容和统计信息
      const doc = documentManager.getDocumentAtCommit(commitId);
      if (doc) {
        const content = doc.getText();
        setDocumentContent(content);
        setDocumentStats(doc.getStats());
      }
    }
  }, [commitId, documentManager, commits]);

  if (!isOpen || !commitInfo) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getContentPreview = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '56rem',
        height: '83.333333%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827'
            }}>版本详情</h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {commitInfo.message}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#4b5563'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {/* 左侧：版本信息 */}
          <div style={{
            width: '33.333333%',
            borderRight: '1px solid #e5e7eb',
            padding: '1rem',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 基本信息 */}
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '0.5rem'
                }}>基本信息</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>版本ID:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{commitInfo.id.substring(0, 12)}...</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>类型:</span>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: commitInfo.isAutoCommit ? '#dbeafe' : '#dcfce7',
                      color: commitInfo.isAutoCommit ? '#1e40af' : '#166534'
                    }}>
                      {commitInfo.isAutoCommit ? '自动保存' : '手动保存'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>创建时间:</span>
                    <span>{new Date(commitInfo.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 文档统计 */}
              {documentStats && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">文档统计</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">字符数:</span>
                      <span>{documentStats.characters.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">字数:</span>
                      <span>{documentStats.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">行数:</span>
                      <span>{documentStats.lines.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">段落数:</span>
                      <span>{documentStats.paragraphs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">文件大小:</span>
                      <span>{formatFileSize(new TextEncoder().encode(documentContent).length)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 内容预览 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">内容预览</h3>
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans">
                    {getContentPreview(documentContent)}
                  </pre>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (confirm('确定要切换到这个版本吗？\n\n注意：当前未保存的更改将会丢失。')) {
                      // TODO: 实现版本切换
                      console.log('切换到版本:', commitId);
                      onClose();
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  切换到此版本
                </button>
                <button
                  onClick={() => {
                    // TODO: 实现版本导出
                    console.log('导出版本:', commitId);
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  导出此版本
                </button>
                <button
                  onClick={() => {
                    // TODO: 实现版本复制
                    navigator.clipboard.writeText(documentContent);
                    alert('内容已复制到剪贴板');
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  复制内容
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：完整内容 */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">完整内容</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {documentContent ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 leading-relaxed">
                  {documentContent}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>此版本没有内容</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              版本 ID: <span className="font-mono">{commitInfo.id}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // TODO: 实现版本对比功能
                  console.log('对比版本:', commitId);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                版本对比
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
