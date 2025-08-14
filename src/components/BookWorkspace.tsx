import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { AdvancedEditor } from './AdvancedEditor';
import { VersionManager } from './VersionManager';
import { VersionDiff } from './VersionDiff';
import { TimelineView } from './TimelineView';

// 文档列表组件
function DocumentList({ 
  documents, 
  currentDocument, 
  onSelectDocument, 
  onCreateDocument, 
  onDeleteDocument 
}: {
  documents: any[];
  currentDocument: any;
  onSelectDocument: (doc: any) => void;
  onCreateDocument: () => void;
  onDeleteDocument: (docId: string) => void;
}) {
  return (
    <div style={{
      width: '300px',
      borderRight: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* 文档列表头部 */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>文档</h3>
        <button
          onClick={onCreateDocument}
          style={{
            padding: '0.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          + 新建
        </button>
      </div>

      {/* 文档列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectDocument(doc)}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e5e7eb',
              cursor: 'pointer',
              backgroundColor: currentDocument?.id === doc.id ? '#dbeafe' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{doc.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{doc.type}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteDocument(doc.id);
              }}
              style={{
                padding: '0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '0.875rem'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 创建文档对话框
function CreateDocumentDialog({ 
  isOpen, 
  onClose, 
  onConfirm 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, type: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('chapter');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onConfirm(title.trim(), type);
      setTitle('');
      setType('chapter');
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '400px',
        maxWidth: '90vw'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>创建新文档</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              文档标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
              placeholder="输入文档标题"
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              文档类型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="chapter">章节</option>
              <option value="note">笔记</option>
              <option value="outline">大纲</option>
              <option value="character">人物设定</option>
              <option value="worldbuilding">世界观</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BookWorkspace() {
  const {
    showBookSelector,
    setShowBookSelector,
    currentBook,
    documents,
    currentDocumentConfig,
    currentDocument,
    setCurrentDocument,
    loadDocuments,
    createDocument,
    deleteDocument,
    selectDocument,
    loadDocumentContent,
    saveDocumentContent,
    documentManager,
    initializeDocumentManager
  } = useAppStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [showVersionDiff, setShowVersionDiff] = useState(false);
  const [showTimelineView, setShowTimelineView] = useState(false);
  const [selectedCommitsForDiff, setSelectedCommitsForDiff] = useState<string[]>([]);
  const [showDevHint, setShowDevHint] = useState(true);

  // 加载当前书籍的文档列表
  useEffect(() => {
    if (currentBook) {
      loadDocuments(currentBook.config.id);
    }
  }, [currentBook, loadDocuments]);

  // 加载当前文档内容并初始化 DocumentManager
  useEffect(() => {
    if (currentBook && currentDocumentConfig) {
      loadDocumentContent(currentBook.config.id, currentDocumentConfig.id)
        .then(content => {
          setDocumentContent(content);
          setCurrentDocument(content);

          // 初始化 DocumentManager
          initializeDocumentManager(content, currentDocumentConfig.title);

          // 启动自动提交（每30秒检查一次，50字变化阈值）
          if (documentManager) {
            documentManager.startAutoCommit(0.5, 50); // 30秒间隔，50字阈值
          }
        })
        .catch(error => {
          console.error('Failed to load document content:', error);
        });
    }
  }, [currentBook, currentDocumentConfig, loadDocumentContent, setCurrentDocument, initializeDocumentManager]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (documentManager) {
        documentManager.stopAutoCommit();
      }
    };
  }, [documentManager]);

  const handleCreateDocument = async (title: string, docType: string) => {
    if (currentBook) {
      await createDocument(currentBook.config.id, title, docType);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (currentBook && window.confirm('确定要删除这个文档吗？此操作不可撤销。')) {
      await deleteDocument(currentBook.config.id, docId);
    }
  };

  const handleContentChange = (content: string) => {
    console.log('📝 Content changed, length:', content.length);
    setDocumentContent(content);
    setCurrentDocument(content);

    // 更新 DocumentManager
    if (documentManager) {
      documentManager.updateDocument(content);
      console.log('📋 DocumentManager updated');
    }

    // 自动保存
    if (currentBook && currentDocumentConfig) {
      console.log('💾 Saving document:', currentBook.config.id, currentDocumentConfig.id);
      saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, content)
        .then(() => {
          console.log('✅ Document saved successfully');
        })
        .catch(error => {
          console.error('❌ Failed to save document content:', error);
        });
    } else {
      console.warn('⚠️ Cannot save: missing book or document config');
    }
  };

  const handleVersionSelect = (commitId: string) => {
    if (documentManager) {
      const success = documentManager.checkoutCommit(commitId);
      if (success) {
        const doc = documentManager.getCurrentDocument();
        const content = doc.getText();
        setDocumentContent(content);
        setCurrentDocument(content);
      }
    }
  };

  const handleManualSave = async () => {
    if (currentBook && currentDocumentConfig && documentContent) {
      try {
        console.log('🔄 Manual save triggered');
        await saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, documentContent);

        // 创建手动提交
        if (documentManager) {
          documentManager.createCommit('手动保存', false);
          console.log('📝 Manual commit created');
        }

        alert('保存成功！');
      } catch (error) {
        console.error('❌ Manual save failed:', error);
        alert('保存失败：' + error);
      }
    }
  };

  const handleImportText = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.markdown';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 检查文件类型
        const allowedTypes = ['text/plain', 'text/markdown', 'application/octet-stream'];
        const allowedExtensions = ['.txt', '.md', '.markdown'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
          alert('不支持的文件类型！请选择文本文件（.txt、.md、.markdown）');
          return;
        }

        // 检查文件大小（限制为10MB）
        if (file.size > 10 * 1024 * 1024) {
          alert('文件太大！请选择小于10MB的文件');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            if (content) {
              setDocumentContent(content);
              setCurrentDocument(content);

              // 更新 DocumentManager
              if (documentManager) {
                documentManager.updateDocument(content);
                documentManager.createCommit(`导入文件: ${file.name}`, false);
              }

              // 保存到后端
              if (currentBook && currentDocumentConfig) {
                saveDocumentContent(currentBook.config.id, currentDocumentConfig.id, content)
                  .then(() => {
                    alert('文件导入成功！');
                  })
                  .catch(error => {
                    console.error('Failed to save imported content:', error);
                    alert('导入失败：' + error);
                  });
              }
            }
          } catch (error) {
            console.error('Failed to read file:', error);
            alert('文件读取失败：' + error);
          }
        };

        reader.onerror = () => {
          alert('文件读取失败！');
        };

        reader.readAsText(file, 'UTF-8');
      }
    };
    input.click();
  };

  const handleVersionDiff = (fromCommit: string, toCommit: string) => {
    setSelectedCommitsForDiff([fromCommit, toCommit]);
    setShowVersionDiff(true);
  };

  if (!currentBook) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>没有书籍</h3>
          <p>请先选择一本书籍开始写作</p>
          <button
            onClick={() => setShowBookSelector(true)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            选择书籍
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <div style={{
        height: '60px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowBookSelector(true)}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            📚 切换书籍
          </button>

          <div>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0
            }}>
              {currentBook.config.name}
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0
            }}>
              {currentBook.config.author} • {currentBook.config.genre}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {currentDocumentConfig && documentManager && (
            <>
              <button
                onClick={handleImportText}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                📁 导入
              </button>
              <button
                onClick={handleManualSave}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                💾 保存
              </button>
              <button
                onClick={() => setShowVersionManager(!showVersionManager)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: showVersionManager ? '#dbeafe' : 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                📝 版本管理
              </button>

              <button
                onClick={() => setShowTimelineView(true)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                📈 时间线
              </button>
            </>
          )}

          {/* 开发者提示 */}
          {showDevHint && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '0.375rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginLeft: '0.5rem'
            }}>
              <span>💡 Ctrl+Shift+E 测试导出</span>
              <button
                onClick={() => setShowDevHint(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#92400e',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '0.75rem'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0
      }}>
        {/* 文档列表侧边栏 */}
        <DocumentList
          documents={documents}
          currentDocument={currentDocumentConfig}
          onSelectDocument={selectDocument}
          onCreateDocument={() => setShowCreateDialog(true)}
          onDeleteDocument={handleDeleteDocument}
        />

        {/* 编辑器区域 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {currentDocumentConfig ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              <AdvancedEditor
                value={documentContent}
                onChange={handleContentChange}
                language="markdown"
                theme="vs-light"
                readOnly={false}
              />
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>选择或创建文档</h3>
                <p>从左侧选择一个文档开始编辑，或创建新的文档</p>
              </div>
            </div>
          )}
        </div>

        {/* 版本管理侧边栏 */}
        {showVersionManager && currentDocumentConfig && documentManager && (
          <div style={{
            width: '350px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb'
          }}>
            <VersionManager
              documentManager={documentManager}
              onVersionSelect={handleVersionSelect}
              onVersionDiff={handleVersionDiff}
            />
          </div>
        )}
      </div>

      {/* 对话框 */}
      <CreateDocumentDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleCreateDocument}
      />

      {/* 版本对比对话框 */}
      {showVersionDiff && documentManager && selectedCommitsForDiff.length === 2 && (
        <VersionDiff
          isOpen={showVersionDiff}
          documentManager={documentManager}
          fromCommit={selectedCommitsForDiff[0]}
          toCommit={selectedCommitsForDiff[1]}
          onClose={() => {
            setShowVersionDiff(false);
            setSelectedCommitsForDiff([]);
          }}
        />
      )}

      {/* 时间线视图 */}
      {showTimelineView && documentManager && (
        <TimelineView
          documentManager={documentManager}
          isOpen={showTimelineView}
          onClose={() => setShowTimelineView(false)}
        />
      )}
    </div>
  );
}
