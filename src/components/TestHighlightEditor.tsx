import { useState, useEffect } from 'react';
import { HighlightEditor } from './HighlightEditor';

export function TestHighlightEditor() {
  const [text, setText] = useState('这是一个测试文本。\n\n我们可以在这里测试搜索和高亮功能。\n\n比如搜索"测试"这个词，应该会被高亮显示。\n\n这个编辑器支持多行文本编辑，\n并且可以实时高亮搜索结果。');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ index: number; length: number }>>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // 执行搜索
  const performSearch = (term: string) => {
    if (!term) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: Array<{ index: number; length: number }> = [];
    const regex = new RegExp(term, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      results.push({
        index: match.index,
        length: term.length
      });
      // 防止无限循环
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  // 当搜索词或文本变化时重新搜索
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        performSearch(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [searchTerm, text]);

  // 下一个搜索结果
  const nextResult = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    }
  };

  // 上一个搜索结果
  const prevResult = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) => prev === 0 ? searchResults.length - 1 : prev - 1);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 搜索栏 */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
          高亮编辑器测试
        </h2>
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
          />
          {searchResults.length > 0 && (
            <>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {currentSearchIndex + 1} / {searchResults.length}
              </span>
              <button
                onClick={prevResult}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                ↑
              </button>
              <button
                onClick={nextResult}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                ↓
              </button>
            </>
          )}
        </div>
      </div>

      {/* 编辑器区域 */}
      <div style={{ flex: 1, padding: '1rem' }}>
        <div style={{
          height: '100%',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <HighlightEditor
            value={text}
            onChange={setText}
            searchTerm={searchTerm}
            currentSearchIndex={currentSearchIndex}
            searchResults={searchResults}
            placeholder="在这里输入文本进行测试..."
          />
        </div>
      </div>

      {/* 状态栏 */}
      <div style={{
        padding: '0.5rem 1rem',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        字符数: {text.length} | 行数: {text.split('\n').length} | 搜索结果: {searchResults.length}
      </div>
    </div>
  );
}
