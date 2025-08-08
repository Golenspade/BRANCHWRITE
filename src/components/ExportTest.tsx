import React, { useState } from 'react';
import { FileSystemService } from '../services/fileSystemService';

interface ExportTestProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportTest: React.FC<ExportTestProps> = ({ isOpen, onClose }) => {
  const [log, setLog] = useState<string[]>([]);
  const [testProjectId, setTestProjectId] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLog = () => {
    setLog([]);
  };

  const testCreateProject = async () => {
    try {
      addLog('开始创建测试项目...');
      
      const projectData = await FileSystemService.createProject(
        '导出测试项目',
        '这是一个用于测试导出功能的项目',
        '测试用户'
      );
      
      setTestProjectId(projectData.config.id);
      addLog(`项目创建成功! ID: ${projectData.config.id}`);
      addLog(`项目名称: ${projectData.config.name}`);
      
      // 添加一些内容
      projectData.document_content = `# 导出测试项目

这是一个测试项目，用于验证导出功能是否正常工作。

## 内容

这里是一些测试内容：

- 列表项 1
- 列表项 2
- 列表项 3

## 代码示例

\`\`\`javascript
function hello() {
    console.log("Hello, World!");
}
\`\`\`

## 结论

如果你能看到这个文件，说明导出功能正常工作！
`;
      
      await FileSystemService.saveProject(projectData);
      addLog('项目内容已保存');
      
    } catch (error) {
      addLog(`创建项目失败: ${error}`);
    }
  };

  const testGetDesktopDir = async () => {
    try {
      addLog('测试获取桌面目录...');
      const desktopDir = await FileSystemService.getDesktopDir();
      addLog(`桌面目录: ${desktopDir}`);
    } catch (error) {
      addLog(`获取桌面目录失败: ${error}`);
    }
  };

  const testExportProject = async () => {
    try {
      if (!testProjectId) {
        addLog('错误: 请先创建测试项目');
        return;
      }
      
      addLog('开始测试导出功能...');
      
      // 获取桌面目录
      const desktopDir = await FileSystemService.getDesktopDir();
      addLog(`桌面目录: ${desktopDir}`);
      
      // 创建导出路径
      const exportPath = `${desktopDir}/BranchWrite_导出测试项目_${new Date().toISOString().split('T')[0]}`;
      addLog(`导出路径: ${exportPath}`);
      
      // 执行导出
      await FileSystemService.exportProject(testProjectId, exportPath);
      
      addLog('导出成功！');
      addLog(`请检查桌面上的文件夹: BranchWrite_导出测试项目_${new Date().toISOString().split('T')[0]}`);
      
    } catch (error) {
      addLog(`导出失败: ${error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">导出功能测试</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <button
              onClick={testCreateProject}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            >
              1. 创建测试项目
            </button>
            <button
              onClick={testExportProject}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
            >
              2. 测试导出功能
            </button>
            <button
              onClick={testGetDesktopDir}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mr-2"
            >
              3. 测试获取桌面目录
            </button>
            <button
              onClick={clearLog}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              清除日志
            </button>
          </div>
          
          <div className="bg-gray-100 border rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {log.length === 0 ? (
              <div className="text-gray-500">点击按钮开始测试...</div>
            ) : (
              log.map((entry, index) => (
                <div key={index} className="mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
