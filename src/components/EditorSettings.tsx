import { useState } from 'react';
import { allEditorThemes, ThemePreferences, defaultThemePreferences } from '../utils/editorThemes';

interface EditorSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ThemePreferences;
  onPreferencesChange: (preferences: ThemePreferences) => void;
}

export function EditorSettings({ 
  isOpen, 
  onClose, 
  preferences, 
  onPreferencesChange 
}: EditorSettingsProps) {
  const [localPreferences, setLocalPreferences] = useState<ThemePreferences>(preferences);

  const handleSave = () => {
    onPreferencesChange(localPreferences);
    onClose();
  };

  const handleReset = () => {
    setLocalPreferences(defaultThemePreferences);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">编辑器设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 主题设置 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">主题设置</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    编辑器主题
                  </label>
                  <select
                    value={localPreferences.currentTheme}
                    onChange={(e) => setLocalPreferences(prev => ({ 
                      ...prev, 
                      currentTheme: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allEditorThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name} - {theme.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoSwitch"
                    checked={localPreferences.autoSwitch}
                    onChange={(e) => setLocalPreferences(prev => ({ 
                      ...prev, 
                      autoSwitch: e.target.checked 
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoSwitch" className="ml-2 block text-sm text-gray-700">
                    根据时间自动切换主题（夜间使用暗色主题）
                  </label>
                </div>
              </div>
            </div>

            {/* 字体设置 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">字体设置</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    字体大小: {localPreferences.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={localPreferences.fontSize}
                    onChange={(e) => setLocalPreferences(prev => ({ 
                      ...prev, 
                      fontSize: parseInt(e.target.value) 
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span>24px</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    行高: {localPreferences.lineHeight}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="36"
                    step="2"
                    value={localPreferences.lineHeight}
                    onChange={(e) => setLocalPreferences(prev => ({ 
                      ...prev, 
                      lineHeight: parseInt(e.target.value) 
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>16px</span>
                    <span>36px</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    字体族
                  </label>
                  <select
                    value={localPreferences.fontFamily}
                    onChange={(e) => setLocalPreferences(prev => ({ 
                      ...prev, 
                      fontFamily: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace">
                      JetBrains Mono (推荐)
                    </option>
                    <option value="'Fira Code', 'Monaco', 'Consolas', monospace">
                      Fira Code
                    </option>
                    <option value="'Monaco', 'Consolas', monospace">
                      Monaco
                    </option>
                    <option value="'Consolas', monospace">
                      Consolas
                    </option>
                    <option value="'Courier New', monospace">
                      Courier New
                    </option>
                    <option value="system-ui, -apple-system, sans-serif">
                      系统默认字体
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* 预览区域 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">预览</h3>
              <div 
                className="p-4 border border-gray-300 rounded-md bg-gray-50"
                style={{
                  fontSize: `${localPreferences.fontSize}px`,
                  lineHeight: `${localPreferences.lineHeight}px`,
                  fontFamily: localPreferences.fontFamily
                }}
              >
                <div className="text-gray-900">
                  <p># 这是一个标题</p>
                  <p>这是一段示例文本，用于预览字体效果。</p>
                  <p>**粗体文本** 和 *斜体文本* 的显示效果。</p>
                  <p>`代码文本` 的显示效果。</p>
                </div>
              </div>
            </div>

            {/* 快捷键说明 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">快捷键</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">保存版本:</span>
                    <span className="font-mono">Ctrl+S</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">粗体:</span>
                    <span className="font-mono">Ctrl+B</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">斜体:</span>
                    <span className="font-mono">Ctrl+I</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">查找:</span>
                    <span className="font-mono">Ctrl+F</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">替换:</span>
                    <span className="font-mono">Ctrl+H</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">格式化:</span>
                    <span className="font-mono">Shift+Alt+F</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              重置为默认
            </button>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
