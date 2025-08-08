import { useState, useEffect } from 'react';
import type { DocumentManager } from '../models/DocumentManager';

interface VersionDiffProps {
  isOpen: boolean;
  onClose: () => void;
  fromCommit: string;
  toCommit: string;
  documentManager: DocumentManager;
}

export function VersionDiff({ isOpen, onClose, fromCommit, toCommit, documentManager }: VersionDiffProps) {
  const commits = documentManager.getCommitHistory();
  const [diffResult, setDiffResult] = useState<{
    oldText: string;
    newText: string;
    changes: Array<{ type: 'added' | 'removed' | 'unchanged'; value: string }>;
  } | null>(null);

  // 简单的文本差异算法
  const computeDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const changes: Array<{ type: 'added' | 'removed' | 'unchanged'; value: string }> = [];

    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (oldIndex >= oldLines.length) {
        // 只剩新行
        changes.push({ type: 'added', value: newLines[newIndex] });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // 只剩旧行
        changes.push({ type: 'removed', value: oldLines[oldIndex] });
        oldIndex++;
      } else if (oldLines[oldIndex] === newLines[newIndex]) {
        // 相同行
        changes.push({ type: 'unchanged', value: oldLines[oldIndex] });
        oldIndex++;
        newIndex++;
      } else {
        // 不同行，简单处理：标记为删除旧行，添加新行
        changes.push({ type: 'removed', value: oldLines[oldIndex] });
        changes.push({ type: 'added', value: newLines[newIndex] });
        oldIndex++;
        newIndex++;
      }
    }

    return changes;
  };

  useEffect(() => {
    if (fromCommit && toCommit && documentManager) {
      const fromDoc = documentManager.getDocumentAtCommit(fromCommit);
      const toDoc = documentManager.getDocumentAtCommit(toCommit);
      
      if (fromDoc && toDoc) {
        const oldText = fromDoc.getText();
        const newText = toDoc.getText();
        const changes = computeDiff(oldText, newText);
        
        setDiffResult({
          oldText,
          newText,
          changes,
        });
      }
    }
  }, [fromCommit, toCommit, documentManager]);

  if (!isOpen) return null;

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
        maxWidth: '72rem',
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
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827'
          }}>版本对比</h2>
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
            onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#4b5563'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#9ca3af'}
          >
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 版本信息 */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                原版本
              </label>
              <div style={{
                padding: '0.5rem',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}>
                {(() => {
                  const commit = commits.find(c => c.id === fromCommit);
                  return commit ? `${commit.message} (${new Date(commit.timestamp).toLocaleString()})` : '未选择版本';
                })()}
              </div>
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                新版本
              </label>
              <div style={{
                padding: '0.5rem',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}>
                {(() => {
                  const commit = commits.find(c => c.id === toCommit);
                  return commit ? `${commit.message} (${new Date(commit.timestamp).toLocaleString()})` : '未选择版本';
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* 差异显示 */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          minHeight: 0  // 确保 flex 子元素可以正确收缩
        }}>
          {diffResult ? (
            <div style={{
              height: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              minHeight: 0  // 确保 grid 容器可以正确收缩
            }}>
              {/* 原版本 */}
              <div style={{
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0  // 确保 flex 容器可以正确收缩
              }}>
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fef2f2',
                  borderBottom: '1px solid #e5e7eb',
                  flexShrink: 0  // 防止头部被压缩
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#b91c1c',
                    margin: 0
                  }}>原版本</h3>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  minHeight: 0,  // 确保可以正确收缩
                  maxHeight: '100%'  // 确保不会超出容器
                }}>
                  {diffResult.changes.map((change, index) => (
                    change.type !== 'added' && (
                      <div
                        key={index}
                        style={{
                          backgroundColor: change.type === 'removed' ? '#fecaca' : 'transparent',
                          color: change.type === 'removed' ? '#dc2626' : '#374151',
                          padding: '0.125rem 0.5rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'  // 防止长行导致水平滚动
                        }}
                      >
                        {change.value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* 新版本 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0  // 确保 flex 容器可以正确收缩
              }}>
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f0fdf4',
                  borderBottom: '1px solid #e5e7eb',
                  flexShrink: 0  // 防止头部被压缩
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#166534',
                    margin: 0
                  }}>新版本</h3>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  minHeight: 0,  // 确保可以正确收缩
                  maxHeight: '100%'  // 确保不会超出容器
                }}>
                  {diffResult.changes.map((change, index) => (
                    change.type !== 'removed' && (
                      <div
                        key={index}
                        style={{
                          backgroundColor: change.type === 'added' ? '#86efac' : 'transparent',
                          color: change.type === 'added' ? '#059669' : '#374151',
                          padding: '0.125rem 0.5rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'  // 防止长行导致水平滚动
                        }}
                      >
                        {change.value}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280'
            }}>
              <p>请选择两个版本进行对比</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
