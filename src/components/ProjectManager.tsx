import { useState, useEffect } from 'react';
import { FileSystemService, ProjectConfig, ProjectManager } from '../services/fileSystemService';
import { useAppStore } from '../stores/appStore';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (projectId: string) => void;
}

export function ProjectManagerComponent({ isOpen, onClose, onProjectSelect }: ProjectManagerProps) {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    author: '',
  });

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectList = await FileSystemService.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
      await FileSystemService.showMessage('错误', '加载项目列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // 创建新项目
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      await FileSystemService.showMessage('提示', '请输入项目名称', 'warning');
      return;
    }

    setLoading(true);
    try {
      const project = await ProjectManager.createAndSetProject(
        newProject.name.trim(),
        newProject.description.trim(),
        newProject.author.trim() || '匿名用户'
      );
      
      await FileSystemService.showMessage('成功', '项目创建成功！', 'info');
      setShowCreateForm(false);
      setNewProject({ name: '', description: '', author: '' });
      onProjectSelect(project.config.id);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      await FileSystemService.showMessage('错误', '创建项目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 打开项目
  const handleOpenProject = async (projectId: string) => {
    setLoading(true);
    try {
      await ProjectManager.loadAndSetProject(projectId);
      onProjectSelect(projectId);
      onClose();
    } catch (error) {
      console.error('Failed to open project:', error);
      await FileSystemService.showMessage('错误', '打开项目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 删除项目
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmed = confirm(`确定要删除项目 "${projectName}" 吗？\n\n此操作不可撤销！`);
    if (!confirmed) return;

    setLoading(true);
    try {
      await FileSystemService.deleteProject(projectId);
      await FileSystemService.showMessage('成功', '项目删除成功', 'info');
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      await FileSystemService.showMessage('错误', '删除项目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 导出项目
  const handleExportProject = async (projectId: string, projectName: string) => {
    try {
      const desktopDir = await FileSystemService.getDesktopDir();
      const exportPath = `${desktopDir}/BranchWrite_${projectName}_${new Date().toISOString().split('T')[0]}`;
      
      await FileSystemService.exportProject(projectId, exportPath);
      await FileSystemService.showMessage('成功', `项目已导出到：${exportPath}`, 'info');
    } catch (error) {
      console.error('Failed to export project:', error);
      await FileSystemService.showMessage('错误', '导出项目失败', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">项目管理</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              disabled={loading}
            >
              新建项目
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {showCreateForm ? (
            /* 创建项目表单 */
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">创建新项目</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目名称 *
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入项目名称"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目描述
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="输入项目描述（可选）"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作者
                  </label>
                  <input
                    type="text"
                    value={newProject.author}
                    onChange={(e) => setNewProject(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入作者名称（可选）"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  disabled={loading || !newProject.name.trim()}
                >
                  {loading ? '创建中...' : '创建项目'}
                </button>
              </div>
            </div>
          ) : (
            /* 项目列表 */
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg mb-2">暂无项目</p>
                  <p className="text-sm">点击"新建项目"开始您的写作之旅</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleOpenProject(project.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {project.name}
                        </h3>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportProject(project.id, project.name);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="导出项目"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id, project.name);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="删除项目"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>作者:</span>
                          <span>{project.author || '未知'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>创建:</span>
                          <span>{formatDate(project.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>修改:</span>
                          <span>{formatDate(project.last_modified)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
