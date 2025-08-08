import { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../stores/appStore';
import { registerCustomThemes, getThemeById, getAutoTheme } from '../utils/editorThemes';

interface AdvancedEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
}

export function AdvancedEditor({ 
  value, 
  onChange, 
  language = 'markdown', 
  theme = 'vs-light',
  readOnly = false 
}: AdvancedEditorProps) {
  const editorRef = useRef<any>(null);
  const { documentManager } = useAppStore();
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // 编辑器配置
  const editorOptions = {
    minimap: { enabled: true },
    fontSize: 14,
    lineHeight: 24,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection' as const,
    renderControlCharacters: true,
    folding: true,
    foldingStrategy: 'indentation' as const,
    showFoldingControls: 'always' as const,
    unfoldOnClickAfterEndOfLine: false,
    contextmenu: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
    cursorBlinking: 'blink' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly,
    // 自动保存相关
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on' as const,
    tabCompletion: 'on' as const,
    wordBasedSuggestions: 'matchingDocuments' as const,
    // 搜索相关
    find: {
      seedSearchStringFromSelection: 'always' as const,
      autoFindInSelection: 'never' as const,
      globalFindClipboard: false,
      addExtraSpaceOnTop: true
    }
  };

  // 编辑器挂载时的回调
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // 注册自定义主题
    registerCustomThemes(monaco);

    // 注册自定义命令
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // 手动保存
      if (documentManager) {
        const message = prompt('请输入版本描述:', '手动保存');
        if (message) {
          documentManager.createCommit(message, false);
        }
      }
    });

    // 监听光标位置变化
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      });
    });

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      const words = content.trim().split(/\s+/).filter((word: string) => word.length > 0);
      setWordCount(words.length);
    });

    // 设置 Markdown 语言特性
    monaco.languages.setLanguageConfiguration('markdown', {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
      brackets: [
        ['[', ']'],
        ['(', ')'],
        ['{', '}']
      ],
      autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
        { open: '*', close: '*' },
        { open: '_', close: '_' }
      ],
      surroundingPairs: [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
        { open: '*', close: '*' },
        { open: '_', close: '_' }
      ]
    });

    // 注册 Markdown 代码片段
    monaco.languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'h1',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '# ${1:标题}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '一级标题'
          },
          {
            label: 'h2',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '## ${1:标题}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '二级标题'
          },
          {
            label: 'h3',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '### ${1:标题}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '三级标题'
          },
          {
            label: 'bold',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '**${1:粗体文本}**',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '粗体'
          },
          {
            label: 'italic',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '*${1:斜体文本}*',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '斜体'
          },
          {
            label: 'code',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '`${1:代码}`',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '行内代码'
          },
          {
            label: 'codeblock',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '```${1:language}\n${2:代码内容}\n```',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '代码块'
          },
          {
            label: 'link',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '[${1:链接文本}](${2:URL})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '链接'
          },
          {
            label: 'image',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '![${1:图片描述}](${2:图片URL})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '图片'
          },
          {
            label: 'quote',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '> ${1:引用内容}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '引用'
          },
          {
            label: 'list',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '- ${1:列表项}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '无序列表'
          },
          {
            label: 'table',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '| ${1:列1} | ${2:列2} | ${3:列3} |\n|---------|---------|----------|\n| ${4:内容1} | ${5:内容2} | ${6:内容3} |',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '表格'
          }
        ];

        return { suggestions };
      }
    });
  };

  // 处理内容变化
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  // 获取编辑器实例的方法
  const getEditor = () => editorRef.current;

  // 插入文本的方法
  const insertText = (text: string) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const range = new (window as any).monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      );
      editorRef.current.executeEdits('', [{ range, text }]);
      editorRef.current.focus();
    }
  };

  // 包装选中文本的方法
  const wrapSelectedText = (prefix: string, suffix: string, placeholder: string = '') => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();

      if (selection && model) {
        const selectedText = model.getValueInRange(selection);

        let newText;
        if (selectedText.trim()) {
          // 如果有选中文本，包装它
          newText = `${prefix}${selectedText}${suffix}`;
        } else {
          // 如果没有选中文本，插入占位符
          newText = `${prefix}${placeholder}${suffix}`;
        }

        const range = new (window as any).monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );

        editorRef.current.executeEdits('', [{ range, text: newText }]);

        // 如果使用了占位符，选中占位符文本
        if (!selectedText.trim() && placeholder) {
          const newSelection = new (window as any).monaco.Selection(
            selection.startLineNumber,
            selection.startColumn + prefix.length,
            selection.startLineNumber,
            selection.startColumn + prefix.length + placeholder.length
          );
          editorRef.current.setSelection(newSelection);
        }

        editorRef.current.focus();
      }
    }
  };

  // 格式化文档
  const formatDocument = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 编辑器工具栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => wrapSelectedText('**', '**', '粗体')}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="粗体 (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => wrapSelectedText('*', '*', '斜体')}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="斜体 (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => wrapSelectedText('`', '`', '代码')}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="行内代码"
          >
            &lt;/&gt;
          </button>
          <div style={{ width: '1px', height: '1rem', backgroundColor: '#d1d5db' }}></div>
          <button
            onClick={() => insertText('# 标题')}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="标题"
          >
            H1
          </button>
          <button
            onClick={() => insertText('[链接文本](URL)')}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="链接"
          >
            🔗
          </button>
          <button
            onClick={() => insertText('![图片描述](图片URL)')}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="图片"
          >
            🖼️
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <span>行 {cursorPosition.line}, 列 {cursorPosition.column}</span>
          <span>字数: {wordCount}</span>
          <button
            onClick={formatDocument}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
            title="格式化文档"
          >
            格式化
          </button>
        </div>
      </div>

      {/* Monaco 编辑器 */}
      <div style={{
        flex: 1,
        minHeight: 0,
        position: 'relative'
      }}>
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          options={editorOptions}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          loading={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <div style={{ color: '#6b7280' }}>加载编辑器中...</div>
            </div>
          }
        />
      </div>
    </div>
  );
}
