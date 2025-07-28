import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { CommitInfo } from '../types';

interface VersionDiffProps {
  isOpen: boolean;
  onClose: () => void;
  fromCommitId?: string;
  toCommitId?: string;
}

export function VersionDiff({ isOpen, onClose, fromCommitId, toCommitId }: VersionDiffProps) {
  const { documentManager, commits } = useAppStore();
  const [fromCommit, setFromCommit] = useState<string>(fromCommitId || '');
  const [toCommit, setToCommit] = useState<string>(toCommitId || '');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">版本对比</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 版本选择器 */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                原版本
              </label>
              <select
                value={fromCommit}
                onChange={(e) => setFromCommit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择版本...</option>
                {commits.map((commit) => (
                  <option key={commit.id} value={commit.id}>
                    {commit.message} ({new Date(commit.timestamp).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新版本
              </label>
              <select
                value={toCommit}
                onChange={(e) => setToCommit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择版本...</option>
                {commits.map((commit) => (
                  <option key={commit.id} value={commit.id}>
                    {commit.message} ({new Date(commit.timestamp).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 差异显示 */}
        <div className="flex-1 overflow-hidden">
          {diffResult ? (
            <div className="h-full grid grid-cols-2 gap-0">
              {/* 原版本 */}
              <div className="border-r border-gray-200 flex flex-col">
                <div className="px-4 py-2 bg-red-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-red-800">原版本</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                  {diffResult.changes.map((change, index) => (
                    change.type !== 'added' && (
                      <div
                        key={index}
                        className={`${
                          change.type === 'removed' 
                            ? 'bg-red-100 text-red-800' 
                            : 'text-gray-700'
                        } px-2 py-1 whitespace-pre-wrap`}
                      >
                        {change.value}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* 新版本 */}
              <div className="flex flex-col">
                <div className="px-4 py-2 bg-green-50 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-green-800">新版本</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                  {diffResult.changes.map((change, index) => (
                    change.type !== 'removed' && (
                      <div
                        key={index}
                        className={`${
                          change.type === 'added' 
                            ? 'bg-green-100 text-green-800' 
                            : 'text-gray-700'
                        } px-2 py-1 whitespace-pre-wrap`}
                      >
                        {change.value}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>请选择两个版本进行对比</p>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-2">
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
  );
}
