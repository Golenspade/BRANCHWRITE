import React, { useState } from 'react';
import { IntegrationTest } from '../test/IntegrationTest';

interface TestResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

export function IntegrationTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // 重写 console.log 来捕获测试日志
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const captureConsole = () => {
    console.log = (...args) => {
      setLogs(prev => [...prev, `[LOG] ${args.join(' ')}`]);
      originalConsoleLog(...args);
    };
    
    console.error = (...args) => {
      setLogs(prev => [...prev, `[ERROR] ${args.join(' ')}`]);
      originalConsoleError(...args);
    };
  };

  const restoreConsole = () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setLogs([]);
    
    captureConsole();

    try {
      // 运行主要集成测试
      await IntegrationTest.runAllTests();
      
      setResults(prev => [...prev, {
        success: true,
        message: '所有集成测试通过',
        timestamp: new Date()
      }]);

      // 运行错误处理测试
      await IntegrationTest.testErrorHandling();
      
      setResults(prev => [...prev, {
        success: true,
        message: '错误处理测试通过',
        timestamp: new Date()
      }]);

    } catch (error) {
      setResults(prev => [...prev, {
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      }]);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setLogs([]);
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'monospace'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: '#1f2937'
      }}>
        前后端集成测试
      </h2>

      <div style={{
        marginBottom: '1rem',
        display: 'flex',
        gap: '1rem'
      }}>
        <button
          onClick={runTests}
          disabled={isRunning}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isRunning ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {isRunning ? '测试运行中...' : '运行集成测试'}
        </button>

        <button
          onClick={clearResults}
          disabled={isRunning}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          清除结果
        </button>
      </div>

      {/* 测试结果 */}
      {results.length > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#374151'
          }}>
            测试结果
          </h3>
          
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                padding: '0.5rem',
                marginBottom: '0.5rem',
                backgroundColor: result.success ? '#dcfce7' : '#fef2f2',
                borderRadius: '0.25rem',
                border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  fontSize: '1rem',
                  color: result.success ? '#16a34a' : '#dc2626'
                }}>
                  {result.success ? '✅' : '❌'}
                </span>
                <span style={{
                  color: result.success ? '#15803d' : '#b91c1c',
                  fontSize: '0.875rem'
                }}>
                  {result.message}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 测试日志 */}
      {logs.length > 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#1f2937',
          borderRadius: '0.375rem',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#f9fafb'
          }}>
            测试日志
          </h3>
          
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                fontSize: '0.75rem',
                color: log.startsWith('[ERROR]') ? '#fca5a5' : '#d1d5db',
                marginBottom: '0.25rem',
                fontFamily: 'monospace'
              }}
            >
              {log}
            </div>
          ))}
        </div>
      )}

      {/* 使用说明 */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        borderRadius: '0.375rem',
        border: '1px solid #bfdbfe'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#1e40af'
        }}>
          测试说明
        </h3>
        <ul style={{
          fontSize: '0.875rem',
          color: '#1e3a8a',
          paddingLeft: '1.5rem'
        }}>
          <li>测试系统目录获取功能</li>
          <li>测试书籍的创建、读取、更新、删除</li>
          <li>测试文档的创建、读取、更新、删除</li>
          <li>测试文件操作功能</li>
          <li>测试错误处理机制</li>
        </ul>
        
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          注意：测试会创建临时数据并在完成后自动清理
        </div>
      </div>
    </div>
  );
}
