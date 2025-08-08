import { useState, useRef, useEffect, useCallback } from 'react';

interface HighlightEditorProps {
  value: string;
  onChange: (value: string) => void;
  searchTerm?: string;
  currentSearchIndex?: number;
  searchResults?: Array<{ index: number; length: number }>;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function HighlightEditor({
  value,
  onChange,
  searchTerm = '',
  currentSearchIndex = 0,
  searchResults = [],
  placeholder = '开始您的写作...',
  className = '',
  style = {}
}: HighlightEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 渲染带高亮的文本
  const renderHighlightedText = useCallback((text: string) => {
    if (!searchTerm || searchResults.length === 0) {
      return text.replace(/\n/g, '<br>');
    }

    const parts = [];
    let lastIndex = 0;

    // 按位置排序搜索结果
    const sortedResults = [...searchResults].sort((a, b) => a.index - b.index);
    const currentResult = searchResults[currentSearchIndex];

    sortedResults.forEach((result) => {
      // 添加高亮前的文本
      if (result.index > lastIndex) {
        const beforeText = text.substring(lastIndex, result.index);
        parts.push(beforeText.replace(/\n/g, '<br>'));
      }

      // 添加高亮的文本
      const isCurrentResult = currentResult && result.index === currentResult.index;
      const highlightedText = text.substring(result.index, result.index + result.length);

      if (isCurrentResult) {
        // 当前选中的结果 - 橙色背景
        parts.push(
          `<mark class="search-highlight current">${highlightedText}</mark>`
        );
      } else {
        // 其他匹配结果 - 黄色背景
        parts.push(
          `<mark class="search-highlight">${highlightedText}</mark>`
        );
      }

      lastIndex = result.index + result.length;
    });

    // 添加剩余的文本
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(remainingText.replace(/\n/g, '<br>'));
    }

    return parts.join('');
  }, [searchTerm, searchResults, currentSearchIndex]);

  // 处理输入变化
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newValue = target.innerText || '';
    onChange(newValue);
  }, [onChange]);

  // 处理粘贴事件，确保只粘贴纯文本
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // 处理 Tab 键
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  '); // 插入两个空格
    }
  }, []);

  // 同步内容到编辑器
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const highlightedHtml = renderHighlightedText(value);
      if (editorRef.current.innerHTML !== highlightedHtml) {
        editorRef.current.innerHTML = highlightedHtml;
      }
    }
  }, [value, renderHighlightedText, isFocused]);

  // 处理焦点事件
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (editorRef.current) {
      // 在获得焦点时，移除高亮显示纯文本
      editorRef.current.innerHTML = value.replace(/\n/g, '<br>');
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // 跳转到搜索结果
  const jumpToSearchResult = useCallback((index: number) => {
    if (!editorRef.current || index < 0 || index >= searchResults.length) return;

    // 简化版本：直接滚动到编辑器并聚焦
    editorRef.current.focus();

    // 如果需要更精确的定位，可以在这里添加更复杂的逻辑
    // 但对于基本的高亮显示，这已经足够了
  }, [searchResults]);

  // 当搜索索引变化时，重新渲染高亮
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0 && currentSearchIndex < searchResults.length && !isFocused) {
      // 触发重新渲染以更新当前高亮
      if (editorRef.current) {
        const highlightedHtml = renderHighlightedText(value);
        editorRef.current.innerHTML = highlightedHtml;
      }
    }
  }, [currentSearchIndex, searchResults, renderHighlightedText, value, isFocused]);

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`highlight-editor ${className}`}
      style={{
        width: '100%',
        height: '100%',
        padding: '1rem',
        border: 'none',
        outline: 'none',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
        fontSize: '0.875rem',
        lineHeight: '1.6',
        backgroundColor: 'transparent',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflowY: 'auto',
        ...style
      }}
      data-placeholder={!value ? placeholder : ''}
    />
  );
}
