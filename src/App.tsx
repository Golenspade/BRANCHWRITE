import { useState, useEffect } from 'react';
import { BookSelector } from './components/BookSelector';
import { BookWorkspace } from './components/BookWorkspace';
import { IntegrationTestRunner } from './components/IntegrationTestRunner';
import { ExportTest } from './components/ExportTest';
import { useAppStore } from './stores/appStore';

// 环境检测
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// 环境提示组件
const EnvironmentBanner = () => {
  if (isTauriEnvironment()) return null;

  return (
    <div style={{
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.75rem 1rem',
      textAlign: 'center',
      fontSize: '0.875rem',
      borderBottom: '1px solid #e5e7eb'
    }}>
      🌐 当前运行在 Web 环境 | 完整功能请使用: <code style={{backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem'}}>npm run tauri dev</code>
    </div>
  );
};

function App() {
  console.log('🚀 App: 组件开始渲染');

  const { showBookSelector, currentBook, selectBook } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [showExportTest, setShowExportTest] = useState(false);

  // 调试信息
  console.log('🔍 App: 当前状态 ->', {
    isReady,
    showBookSelector,
    currentBook: currentBook?.config?.id || null,
  });

  useEffect(() => {
    console.log('🚀 App: 开始初始化应用');

    const initializeApp = async () => {
      try {
        console.log('⏳ App: 模拟初始化过程...');

        // 模拟初始化过程
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ App: 初始化完成');
        setIsReady(true);
      } catch (err) {
        console.error('❌ App: 初始化失败:', err);
        setIsReady(true); // 即使失败也设为就绪，避免无限加载
      }
    };

    initializeApp();
  }, []);

  // 添加键盘快捷键监听器（开发模式）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+T 打开/关闭测试界面
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        setShowTestRunner(prev => !prev);
        console.log('🧪 App: 切换测试界面显示状态');
      }
      // Ctrl+Shift+E 打开/关闭导出测试界面
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setShowExportTest(prev => !prev);
        console.log('📤 App: 切换导出测试界面显示状态');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (currentBook) {
      console.log('📖 App: 当前书本 ->', currentBook.config.id);
    }
  }, [currentBook]);

  // 如果显示测试界面
  if (showTestRunner) {
    console.log('🧪 App: 显示集成测试界面');
    return (
      <div>
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000
        }}>
          <button
            onClick={() => setShowTestRunner(false)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            关闭测试界面
          </button>
        </div>
        <IntegrationTestRunner />
      </div>
    );
  }

  // 如果显示导出测试界面
  if (showExportTest) {
    console.log('📤 App: 显示导出测试界面');
    return (
      <div>
        <ExportTest
          isOpen={showExportTest}
          onClose={() => setShowExportTest(false)}
        />
      </div>
    );
  }

  // 如果还没有初始化完成，显示加载界面
  if (!isReady) {
    console.log('⏳ App: 显示加载界面');
    return (
      <>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
              请查看浏览器控制台了解详细信息
            </p>
            <p style={{ color: '#a78bfa', margin: '0.5rem 0 0 0', fontSize: '0.75rem' }}>
              开发模式：按 Ctrl+Shift+T 打开集成测试界面
            </p>
          </div>
        </div>
      </>
    );
  }

  // 显示书本选择器
  if (showBookSelector) {
    console.log('📚 App: 显示书本选择器');
    return (
      <>
        <EnvironmentBanner />
        <BookSelector
          onBookSelected={(bookId) => {
            console.log('🎯 App: 用户选择了书本 ->', bookId);
            selectBook(bookId);
          }}
        />
      </>
    );
  }

  // 显示书本工作区
  if (currentBook) {
    console.log('✏️ App: 显示书本工作区，书本ID:', currentBook.config.id);
    return (
      <>
        <EnvironmentBanner />
        <BookWorkspace />
      </>
    );
  }
  if(currentBook === null) {
    console.log('❌ App: 书本数据为空，显示错误界面');
  }
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>应用状态异常</h2>
        <p>调试信息: isReady={String(isReady)}, showBookSelector={String(showBookSelector)}, currentBook={currentBook ? 'exists' : 'null'}</p>
      </div>
    </div>
  );
}

export default App;
