import { useState, useEffect } from 'react';
import { marked } from 'marked';

// 简单的版本管理类型定义
interface Version {
  id: string;
  content: string;
  message: string;
  timestamp: number;
  isAutoCommit: boolean;
}

// 简单的 diff 计算函数
function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const changes: Array<{ type: 'added' | 'removed' | 'unchanged'; value: string; lineNumber?: number }> = [];

  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      changes.push({ type: 'added', value: newLine, lineNumber: i + 1 });
    } else if (newLine === undefined) {
      changes.push({ type: 'removed', value: oldLine, lineNumber: i + 1 });
    } else if (oldLine !== newLine) {
      changes.push({ type: 'removed', value: oldLine, lineNumber: i + 1 });
      changes.push({ type: 'added', value: newLine, lineNumber: i + 1 });
    } else {
      changes.push({ type: 'unchanged', value: oldLine, lineNumber: i + 1 });
    }
  }

  return changes;
}

// DiffView 组件
function DiffView({ version1, version2 }: { version1?: Version; version2?: Version }) {
  if (!version1 || !version2) return null;

  const diffResult = computeDiff(version1.content, version2.content);

  return (
    <div className="diff-container">
      {/* 左侧：旧版本 */}
      <div className="diff-panel old">
        <div className="diff-header old">
          {version1.message} (旧版本)
        </div>
        <div className="diff-content">
          {diffResult.map((change, index) => (
            change.type !== 'added' && (
              <div
                key={index}
                className={`diff-line ${change.type}`}
              >
                <span className="diff-line-number">
                  {change.lineNumber}
                </span>
                {change.type === 'removed' && <span className="diff-marker">-</span>}
                {change.value}
              </div>
            )
          ))}
        </div>
      </div>

      {/* 右侧：新版本 */}
      <div className="diff-panel new">
        <div className="diff-header new">
          {version2.message} (新版本)
        </div>
        <div className="diff-content">
          {diffResult.map((change, index) => (
            change.type !== 'removed' && (
              <div
                key={index}
                className={`diff-line ${change.type}`}
              >
                <span className="diff-line-number">
                  {change.lineNumber}
                </span>
                {change.type === 'added' && <span className="diff-marker">+</span>}
                {change.value}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [text, setText] = useState('欢迎使用 BranchWrite1！\n\n这是一个专为作家设计的写作工具，具有以下特性：\n\n- 📝 专业的 Markdown 编辑器\n- 🔄 Git 风格的版本管理\n- 💾 本地文件存储\n- 🎨 多种编辑器主题\n- 📊 实时字数统计\n\n开始您的写作之旅吧！');
  const [currentMode, setCurrentMode] = useState<'edit' | 'preview' | 'diff'>('edit');
  const [versions, setVersions] = useState<Version[]>([
    // 添加一些示例版本用于测试
    {
      id: '1',
      content: '欢迎使用 BranchWrite1！\n\n这是一个专为作家设计的写作工具。\n\n开始您的写作之旅吧！',
      message: '初始版本',
      timestamp: Date.now() - 3600000,
      isAutoCommit: false
    },
    {
      id: '2',
      content: '欢迎使用 BranchWrite1！\n\n这是一个专为作家设计的写作工具，具有以下特性：\n\n- 📝 专业的 Markdown 编辑器\n- 🔄 Git 风格的版本管理\n- 💾 本地文件存储\n\n开始您的写作之旅吧！',
      message: '添加功能列表',
      timestamp: Date.now() - 1800000,
      isAutoCommit: false
    },
    {
      id: '3',
      content: '欢迎使用 BranchWrite1！\n\n这是一个专为作家设计的写作工具，具有以下特性：\n\n- 📝 专业的 Markdown 编辑器\n- 🔄 Git 风格的版本管理\n- 💾 本地文件存储\n- 🎨 多种编辑器主题\n- 📊 实时字数统计\n\n开始您的写作之旅吧！',
      message: '完善功能列表',
      timestamp: Date.now() - 900000,
      isAutoCommit: false
    }
  ]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');

  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const lineCount = text.split('\n').length;

  // 版本管理功能
  const createVersion = (message: string, isAutoCommit: boolean = false) => {
    const newVersion: Version = {
      id: Date.now().toString(),
      content: text,
      message,
      timestamp: Date.now(),
      isAutoCommit
    };
    setVersions(prev => [newVersion, ...prev]);
    return newVersion.id;
  };

  const loadVersion = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setText(version.content);
    }
  };

  // 自动保存功能
  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      if (text.trim() && versions.length === 0 ||
          (versions.length > 0 && versions[0].content !== text)) {
        createVersion('自动保存', true);
      }
    }, 30000); // 每30秒自动保存

    return () => clearInterval(autoSaveTimer);
  }, [text, versions]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: 保存版本
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const message = prompt('请输入版本说明：');
        if (message) {
          createVersion(message, false);
        }
      }

      // Ctrl/Cmd + 1: 编辑模式
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setCurrentMode('edit');
      }

      // Ctrl/Cmd + 2: 预览模式
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setCurrentMode('preview');
      }

      // Ctrl/Cmd + 3: Diff 模式 (如果有选中的版本)
      if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        if (selectedVersions.length === 2) {
          setCurrentMode('diff');
        }
      }

      // Ctrl/Cmd + H: 切换版本历史面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowVersionPanel(!showVersionPanel);
      }

      // Ctrl/Cmd + F: 搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchPanel(!showSearchPanel);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedVersions.length, showVersionPanel, showSearchPanel]);

  // 搜索和替换功能
  const handleSearch = () => {
    if (!searchTerm) return;

    const textarea = document.querySelector('textarea');
    if (textarea) {
      const content = textarea.value;
      const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (index !== -1) {
        textarea.focus();
        textarea.setSelectionRange(index, index + searchTerm.length);
      }
    }
  };

  const handleReplace = () => {
    if (!searchTerm) return;

    const newText = text.replace(new RegExp(searchTerm, 'gi'), replaceTerm);
    setText(newText);
  };

  const handleReplaceAll = () => {
    if (!searchTerm) return;

    const newText = text.replace(new RegExp(searchTerm, 'gi'), replaceTerm);
    setText(newText);
  };



  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* 顶部工具栏 */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.75rem 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#111827'
            }}>
              BranchWrite1
            </h1>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              专业写作工具
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="toolbar-button">
              新建项目
            </button>
            <button className="toolbar-button">
              打开项目
            </button>
            <div style={{
              display: 'flex',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }}>
              <button
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderTopLeftRadius: '0.375rem',
                  borderBottomLeftRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: currentMode === 'edit' ? '#2563eb' : 'white',
                  color: currentMode === 'edit' ? 'white' : '#374151'
                }}
                onClick={() => setCurrentMode('edit')}
              >
                编辑
              </button>
              <button
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  borderLeft: '1px solid #d1d5db',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: currentMode === 'preview' ? '#2563eb' : 'white',
                  color: currentMode === 'preview' ? 'white' : '#374151'
                }}
                onClick={() => setCurrentMode('preview')}
              >
                预览
              </button>
              <button
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderTopRightRadius: '0.375rem',
                  borderBottomRightRadius: '0.375rem',
                  border: 'none',
                  borderLeft: '1px solid #d1d5db',
                  cursor: selectedVersions.length === 2 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  backgroundColor: currentMode === 'diff' ? '#f59e0b' : selectedVersions.length === 2 ? '#f59e0b' : '#f3f4f6',
                  color: currentMode === 'diff' || selectedVersions.length === 2 ? 'white' : '#9ca3af',
                  opacity: selectedVersions.length === 2 ? 1 : 0.5
                }}
                onClick={() => {
                  if (selectedVersions.length === 2) {
                    setCurrentMode('diff');
                  } else {
                    alert(`请先选择两个版本进行对比！\n\n当前已选择: ${selectedVersions.length} 个版本\n\n操作步骤:\n1. 点击"版本历史"按钮\n2. 按住 Ctrl/Cmd 键\n3. 点击两个不同的版本`);
                  }
                }}
                disabled={selectedVersions.length !== 2}
                title={selectedVersions.length === 2 ? '点击查看版本对比' : `需要选择2个版本，当前已选择${selectedVersions.length}个`}
              >
                对比 {selectedVersions.length > 0 && `(${selectedVersions.length}/2)`}
              </button>
            </div>
            <button
              className="toolbar-button-primary"
              onClick={() => {
                const message = prompt('请输入版本说明：');
                if (message) {
                  createVersion(message, false);
                }
              }}
            >
              保存版本
            </button>
            <button
              className="toolbar-button"
              onClick={() => setShowVersionPanel(!showVersionPanel)}
              style={{
                backgroundColor: showVersionPanel ? '#8b5cf6' : undefined,
                color: showVersionPanel ? 'white' : undefined
              }}
            >
              版本历史
            </button>
            <button
              className="toolbar-button"
              onClick={() => {
                const blob = new Blob([text], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `branchwrite-${new Date().toISOString().split('T')[0]}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              导出 MD
            </button>
          </div>
        </div>
      </header>

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        {/* 编辑器区域 */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 搜索面板 */}
          {showSearchPanel && (
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>搜索:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="输入搜索内容..."
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    width: '200px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>替换:</label>
                <input
                  type="text"
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  placeholder="替换为..."
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    width: '200px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSearch}
                  className="toolbar-button"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  查找
                </button>
                <button
                  onClick={handleReplace}
                  className="toolbar-button"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  替换
                </button>
                <button
                  onClick={handleReplaceAll}
                  className="toolbar-button"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  全部替换
                </button>
                <button
                  onClick={() => setShowSearchPanel(false)}
                  className="toolbar-button"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, padding: '1.5rem' }}>
            <div style={{
              height: '100%',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              {currentMode === 'edit' ? (
                <div style={{ height: '100%', padding: '1rem' }}>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '1rem',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
                      fontSize: '0.875rem',
                      lineHeight: '1.6'
                    }}
                    placeholder="开始您的写作..."
                  />
                </div>
              ) : currentMode === 'preview' ? (
                <div style={{
                  height: '100%',
                  padding: '1.5rem',
                  overflowY: 'auto',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    minHeight: 'calc(100% - 4rem)'
                  }}>
                    <div
                      className="markdown-preview"
                      style={{
                        color: '#111827',
                        lineHeight: '1.7',
                        fontSize: '1rem'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: text ? marked(text) : '<p style="color: #9ca3af; font-style: italic;">暂无内容</p>'
                      }}
                    />
                  </div>
                </div>
              ) : currentMode === 'diff' ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Diff 头部 */}
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                      版本对比
                    </h3>
                    {selectedVersions.length === 2 && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        对比版本: {versions.find(v => v.id === selectedVersions[0])?.message} ↔ {versions.find(v => v.id === selectedVersions[1])?.message}
                      </div>
                    )}
                  </div>

                  {/* Diff 内容 */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {selectedVersions.length === 2 ? (
                      <DiffView
                        version1={versions.find(v => v.id === selectedVersions[0])}
                        version2={versions.find(v => v.id === selectedVersions[1])}
                      />
                    ) : (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <p>请在版本历史中选择两个版本进行对比</p>
                          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            按住 Ctrl/Cmd 键点击版本可多选
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>

        {/* 侧边栏 - 版本管理 */}
        <aside style={{
          width: '20rem',
          backgroundColor: 'white',
          borderLeft: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827'
            }}>
              文档信息
            </h2>
          </div>
          <div style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                统计信息
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>字符数:</span>
                  <span>{text.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>字数:</span>
                  <span>{wordCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>行数:</span>
                  <span>{lineCount}</span>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              padding: '1rem',
              flex: showVersionPanel ? 1 : 'none',
              maxHeight: showVersionPanel ? '300px' : 'auto',
              overflow: showVersionPanel ? 'auto' : 'visible'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                版本历史 ({versions.length}) {selectedVersions.length > 0 && `- 已选${selectedVersions.length}个`}
              </h3>
              {versions.length === 0 ? (
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  暂无版本记录
                </div>
              ) : (
                <div>
                  {selectedVersions.length === 0 && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '0.375rem',
                      border: '1px solid #bae6fd'
                    }}>
                      💡 按住 Ctrl/Cmd 键点击版本可多选，选择2个版本后可进行对比
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {versions.slice(0, showVersionPanel ? versions.length : 3).map((version) => (
                      <div
                        key={version.id}
                        className={`version-item ${selectedVersions.includes(version.id) ? 'selected' : ''}`}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            // 多选模式
                            setSelectedVersions(prev =>
                              prev.includes(version.id)
                                ? prev.filter(id => id !== version.id)
                                : prev.length < 2 ? [...prev, version.id] : [prev[1], version.id]
                            );
                          } else {
                            // 单选模式 - 加载版本
                            if (confirm(`确定要切换到版本 "${version.message}" 吗？`)) {
                              loadVersion(version.id);
                            }
                          }
                        }}
                      >
                        <div className="version-message">
                          {version.message}
                        </div>
                        <div className="version-meta">
                          <span>{new Date(version.timestamp).toLocaleString()}</span>
                          {version.isAutoCommit && <span className="auto-commit-badge">(自动)</span>}
                        </div>
                      </div>
                    ))}
                    {!showVersionPanel && versions.length > 3 && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                        还有 {versions.length - 3} 个版本...
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedVersions.length > 0 && (
                <div className={`selection-hint ${selectedVersions.length === 2 ? 'ready' : ''}`}>
                  已选择 {selectedVersions.length} 个版本
                  {selectedVersions.length === 2 && ' - 可以进行对比'}
                  {selectedVersions.length === 1 && ' - 再选择一个版本进行对比'}
                </div>
              )}
            </div>

            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                快捷操作
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'white'}
                  onClick={() => setText('')}
                >
                  清空文档
                </button>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'white'}
                  onClick={() => alert('导出功能开发中...')}
                >
                  导出文档
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 状态栏 */}
      <footer style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '0.5rem 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>模式: {currentMode === 'edit' ? '编辑' : '预览'}</span>
            <span>字符: {text.length}</span>
            <span>字数: {wordCount}</span>
            <span>行数: {lineCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#059669' }}>● 已保存</span>
            <span>BranchWrite1 v1.0.0</span>
            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
              快捷键: Ctrl+S 保存 | Ctrl+1/2/3 切换模式 | Ctrl+H 历史 | Ctrl+F 搜索
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;