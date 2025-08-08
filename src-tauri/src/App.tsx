import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { HighlightEditor } from './components/HighlightEditor';
import { TestHighlightEditor } from './components/TestHighlightEditor';
import { BookSelector } from './components/BookSelector';

// 版本信息接口
interface Version {
  id: string;
  content: string;
  message: string;
  timestamp: number;
  isAutoCommit: boolean;
}

// 差异视图组件
function DiffView({ version1, version2 }: { version1?: Version; version2?: Version }) {
  if (!version1 || !version2) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
      请选择两个版本进行对比
    </div>;
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: '1rem', borderRight: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>
          {version1.message} ({new Date(version1.timestamp).toLocaleString()})
        </h3>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          fontSize: '14px', 
          lineHeight: '1.5',
          color: '#374151',
          backgroundColor: '#fef2f2',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #fecaca'
        }}>
          {version1.content}
        </pre>
      </div>
      <div style={{ flex: 1, padding: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>
          {version2.message} ({new Date(version2.timestamp).toLocaleString()})
        </h3>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          fontSize: '14px', 
          lineHeight: '1.5',
          color: '#374151',
          backgroundColor: '#f0fdf4',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #bbf7d0'
        }}>
          {version2.content}
        </pre>
      </div>
    </div>
  );
}

function App() {
  console.log('App component rendering...');

  const [appState, setAppState] = useState<'loading' | 'ready' | 'error' | 'test' | 'book-selector' | 'book-workspace'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [components, setComponents] = useState<any>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Loading app components...');
        
        // 模拟加载过程
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 直接进入书本选择器
        setAppState('book-selector');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : String(err));
        setAppState('error');
      }
    };

    initializeApp();
  }, []);

  // 加载状态
  if (appState === 'loading') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#64748b', margin: 0 }}>正在加载 BranchWrite1...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (appState === 'error') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>应用加载失败</h2>
          <p style={{ color: '#7f1d1d', marginBottom: '2rem' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 测试模式
  if (appState === 'test') {
    return <TestHighlightEditor />;
  }

  // 书本选择器
  if (appState === 'book-selector') {
    return (
      <BookSelector
        onBookSelected={(bookId) => {
          setSelectedBookId(bookId);
          setAppState('book-workspace');
        }}
      />
    );
  }

  // 书本工作区
  if (appState === 'book-workspace') {
    // TODO: 实现书本工作区
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>书本工作区</h1>
        <p>书本 ID: {selectedBookId}</p>
        <button
          onClick={() => {
            setSelectedBookId(null);
            setAppState('book-selector');
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          返回书本选择器
        </button>
      </div>
    );
  }

  // 默认状态（不应该到达这里）
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#64748b' }}>BranchWrite1</h2>
        <p style={{ color: '#9ca3af' }}>应用状态未知: {appState}</p>
        <button
          onClick={() => setAppState('book-selector')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          进入书本选择器
        </button>
      </div>
    </div>
  );
}

export default App;
