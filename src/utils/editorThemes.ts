// 编辑器主题配置

export interface EditorTheme {
  id: string;
  name: string;
  monacoTheme: string;
  description: string;
  isDark: boolean;
}

export const editorThemes: EditorTheme[] = [
  {
    id: 'light',
    name: '明亮主题',
    monacoTheme: 'vs',
    description: '经典的明亮主题，适合白天使用',
    isDark: false
  },
  {
    id: 'dark',
    name: '暗黑主题',
    monacoTheme: 'vs-dark',
    description: '护眼的暗黑主题，适合夜间使用',
    isDark: true
  },
  {
    id: 'high-contrast',
    name: '高对比度',
    monacoTheme: 'hc-black',
    description: '高对比度主题，提升可读性',
    isDark: true
  }
];

// 自定义写作主题
export const customWritingThemes = {
  // 专注写作主题
  focusWriting: {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'type', foreground: '267F99' },
      { token: 'class', foreground: '267F99' },
      { token: 'interface', foreground: '267F99' },
      { token: 'enum', foreground: '267F99' },
      { token: 'typeParameter', foreground: '267F99' },
      { token: 'function', foreground: '795E26' },
      { token: 'member', foreground: '795E26' },
      { token: 'macro', foreground: '795E26' },
      { token: 'variable', foreground: '001080' },
      { token: 'parameter', foreground: '001080' },
      { token: 'property', foreground: '001080' },
      { token: 'label', foreground: '000000' }
    ],
    colors: {
      'editor.background': '#FEFEFE',
      'editor.foreground': '#2E3440',
      'editor.lineHighlightBackground': '#F8F9FA',
      'editor.selectionBackground': '#E3F2FD',
      'editor.inactiveSelectionBackground': '#F5F5F5',
      'editorCursor.foreground': '#2E3440',
      'editorWhitespace.foreground': '#E0E0E0',
      'editorLineNumber.foreground': '#9E9E9E',
      'editorLineNumber.activeForeground': '#2E3440'
    }
  },

  // 夜间写作主题
  nightWriting: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7C7C7C', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'class', foreground: '4EC9B0' },
      { token: 'interface', foreground: '4EC9B0' },
      { token: 'enum', foreground: '4EC9B0' },
      { token: 'typeParameter', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'member', foreground: 'DCDCAA' },
      { token: 'macro', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'parameter', foreground: '9CDCFE' },
      { token: 'property', foreground: '9CDCFE' },
      { token: 'label', foreground: 'C8C8C8' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editor.lineHighlightBackground': '#2A2A2A',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorCursor.foreground': '#AEAFAD',
      'editorWhitespace.foreground': '#404040',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6'
    }
  },

  // 护眼主题
  eyeCare: {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0066CC' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'type', foreground: '267F99' },
      { token: 'class', foreground: '267F99' },
      { token: 'interface', foreground: '267F99' },
      { token: 'enum', foreground: '267F99' },
      { token: 'typeParameter', foreground: '267F99' },
      { token: 'function', foreground: '795E26' },
      { token: 'member', foreground: '795E26' },
      { token: 'macro', foreground: '795E26' },
      { token: 'variable', foreground: '001080' },
      { token: 'parameter', foreground: '001080' },
      { token: 'property', foreground: '001080' },
      { token: 'label', foreground: '000000' }
    ],
    colors: {
      'editor.background': '#F7F3E9', // 护眼的米黄色背景
      'editor.foreground': '#2D3748',
      'editor.lineHighlightBackground': '#F1EDE4',
      'editor.selectionBackground': '#E2E8F0',
      'editor.inactiveSelectionBackground': '#EDF2F7',
      'editorCursor.foreground': '#2D3748',
      'editorWhitespace.foreground': '#CBD5E0',
      'editorLineNumber.foreground': '#A0AEC0',
      'editorLineNumber.activeForeground': '#2D3748'
    }
  }
};

// 注册自定义主题的函数
export const registerCustomThemes = (monaco: any) => {
  // 注册专注写作主题
  monaco.editor.defineTheme('focus-writing', customWritingThemes.focusWriting);
  
  // 注册夜间写作主题
  monaco.editor.defineTheme('night-writing', customWritingThemes.nightWriting);
  
  // 注册护眼主题
  monaco.editor.defineTheme('eye-care', customWritingThemes.eyeCare);
};

// 扩展的主题列表（包含自定义主题）
export const allEditorThemes: EditorTheme[] = [
  ...editorThemes,
  {
    id: 'focus-writing',
    name: '专注写作',
    monacoTheme: 'focus-writing',
    description: '专为写作优化的明亮主题',
    isDark: false
  },
  {
    id: 'night-writing',
    name: '夜间写作',
    monacoTheme: 'night-writing',
    description: '专为夜间写作优化的暗黑主题',
    isDark: true
  },
  {
    id: 'eye-care',
    name: '护眼模式',
    monacoTheme: 'eye-care',
    description: '护眼的米黄色主题，减少眼部疲劳',
    isDark: false
  }
];

// 获取主题配置
export const getThemeById = (id: string): EditorTheme | undefined => {
  return allEditorThemes.find(theme => theme.id === id);
};

// 获取默认主题
export const getDefaultTheme = (): EditorTheme => {
  return allEditorThemes[0]; // 返回明亮主题作为默认
};

// 根据时间自动选择主题
export const getAutoTheme = (): EditorTheme => {
  const hour = new Date().getHours();
  
  // 夜间时间 (22:00 - 6:00) 使用夜间主题
  if (hour >= 22 || hour < 6) {
    return getThemeById('night-writing') || getDefaultTheme();
  }
  
  // 白天使用专注写作主题
  return getThemeById('focus-writing') || getDefaultTheme();
};

// 主题偏好设置
export interface ThemePreferences {
  currentTheme: string;
  autoSwitch: boolean;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
}

export const defaultThemePreferences: ThemePreferences = {
  currentTheme: 'focus-writing',
  autoSwitch: false,
  fontSize: 14,
  lineHeight: 24,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace"
};
