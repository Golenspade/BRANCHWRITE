use crate::file_system::{FileSystemManager, ProjectConfig, ProjectData};
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

/// 应用状态
pub struct AppState {
    pub file_manager: Mutex<FileSystemManager>,
}

impl AppState {
    pub fn new() -> Result<Self> {
        Ok(Self {
            file_manager: Mutex::new(FileSystemManager::new()?),
        })
    }
}

/// 创建新项目
#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    name: String,
    description: String,
    author: String,
) -> Result<ProjectData, String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    
    file_manager
        .create_project(&name, &description, &author)
        .map_err(|e| e.to_string())
}

/// 保存项目
#[tauri::command]
pub async fn save_project(
    state: State<'_, AppState>,
    project_data: ProjectData,
) -> Result<(), String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    
    file_manager
        .save_project(&project_data)
        .map_err(|e| e.to_string())
}

/// 加载项目
#[tauri::command]
pub async fn load_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectData, String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    
    file_manager
        .load_project(&project_id)
        .map_err(|e| e.to_string())
}

/// 列出所有项目
#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
) -> Result<Vec<ProjectConfig>, String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    
    file_manager
        .list_projects()
        .map_err(|e| e.to_string())
}

/// 删除项目
#[tauri::command]
pub async fn delete_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    
    file_manager
        .delete_project(&project_id)
        .map_err(|e| e.to_string())
}

/// 导出项目
#[tauri::command]
pub async fn export_project(
    state: State<'_, AppState>,
    project_id: String,
    export_path: String,
) -> Result<(), String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    let path = PathBuf::from(export_path);
    
    file_manager
        .export_project(&project_id, &path)
        .map_err(|e| e.to_string())
}

/// 获取项目统计信息
#[tauri::command]
pub async fn get_project_stats(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<HashMap<String, Value>, String> {
    let file_manager = state.file_manager.lock().map_err(|e| e.to_string())?;
    
    file_manager
        .get_project_stats(&project_id)
        .map_err(|e| e.to_string())
}

/// 选择文件夹对话框
#[tauri::command]
pub async fn select_folder() -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
    
    // 这里需要在实际的 Tauri 应用上下文中调用
    // 暂时返回一个占位符
    Ok(None)
}

/// 选择文件对话框
#[tauri::command]
pub async fn select_file(filters: Vec<(String, Vec<String>)>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
    
    // 这里需要在实际的 Tauri 应用上下文中调用
    // 暂时返回一个占位符
    Ok(None)
}

/// 显示消息对话框
#[tauri::command]
pub async fn show_message(
    title: String,
    message: String,
    kind: String,
) -> Result<(), String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
    
    let dialog_kind = match kind.as_str() {
        "info" => MessageDialogKind::Info,
        "warning" => MessageDialogKind::Warning,
        "error" => MessageDialogKind::Error,
        _ => MessageDialogKind::Info,
    };
    
    // 这里需要在实际的 Tauri 应用上下文中调用
    // 暂时返回成功
    Ok(())
}

/// 检查文件是否存在
#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    use std::path::Path;
    Ok(Path::new(&path).exists())
}

/// 创建目录
#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    use std::fs;
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

/// 读取文件内容
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    use std::fs;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// 写入文件内容
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    use std::fs;
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 获取文件信息
#[tauri::command]
pub async fn get_file_info(path: String) -> Result<HashMap<String, Value>, String> {
    use std::fs;
    use std::path::Path;
    
    let path = Path::new(&path);
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    
    let mut info = HashMap::new();
    info.insert("exists".to_string(), Value::Bool(path.exists()));
    info.insert("is_file".to_string(), Value::Bool(metadata.is_file()));
    info.insert("is_dir".to_string(), Value::Bool(metadata.is_dir()));
    info.insert("size".to_string(), Value::Number(metadata.len().into()));
    
    if let Ok(modified) = metadata.modified() {
        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
            info.insert("modified".to_string(), Value::Number(duration.as_secs().into()));
        }
    }
    
    Ok(info)
}

/// 列出目录内容
#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<HashMap<String, Value>>, String> {
    use std::fs;
    use std::path::Path;
    
    let path = Path::new(&path);
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        
        let mut item = HashMap::new();
        item.insert("name".to_string(), Value::String(
            path.file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string()
        ));
        item.insert("path".to_string(), Value::String(
            path.to_string_lossy().to_string()
        ));
        item.insert("is_file".to_string(), Value::Bool(metadata.is_file()));
        item.insert("is_dir".to_string(), Value::Bool(metadata.is_dir()));
        item.insert("size".to_string(), Value::Number(metadata.len().into()));
        
        if let Ok(modified) = metadata.modified() {
            if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                item.insert("modified".to_string(), Value::Number(duration.as_secs().into()));
            }
        }
        
        items.push(item);
    }
    
    // 按名称排序
    items.sort_by(|a, b| {
        let name_a = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let name_b = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        name_a.cmp(name_b)
    });
    
    Ok(items)
}

/// 获取应用数据目录
#[tauri::command]
pub async fn get_app_data_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|dir| dir.join(".branchwrite").to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get home directory".to_string())
}

/// 获取用户文档目录
#[tauri::command]
pub async fn get_documents_dir() -> Result<String, String> {
    dirs::document_dir()
        .map(|dir| dir.to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get documents directory".to_string())
}

/// 获取桌面目录
#[tauri::command]
pub async fn get_desktop_dir() -> Result<String, String> {
    dirs::desktop_dir()
        .map(|dir| dir.to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get desktop directory".to_string())
}
