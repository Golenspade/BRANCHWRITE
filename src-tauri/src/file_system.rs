use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// 项目配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub last_modified: DateTime<Utc>,
    pub version: String,
    pub author: String,
    pub settings: ProjectSettings,
}

/// 项目设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub auto_save_interval: u32, // 分钟
    pub auto_commit_threshold: u32, // 字数
    pub backup_enabled: bool,
    pub backup_interval: u32, // 小时
    pub editor_theme: String,
    pub font_size: u32,
    pub line_height: u32,
    pub font_family: String,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            auto_save_interval: 5,
            auto_commit_threshold: 50,
            backup_enabled: true,
            backup_interval: 24,
            editor_theme: "focus-writing".to_string(),
            font_size: 14,
            line_height: 24,
            font_family: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace".to_string(),
        }
    }
}

/// 文档元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub id: String,
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub last_modified: DateTime<Utc>,
    pub word_count: u32,
    pub character_count: u32,
    pub line_count: u32,
    pub tags: Vec<String>,
}

/// 版本提交信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitInfo {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub message: String,
    pub is_auto_commit: bool,
    pub document_hash: String,
    pub word_count: u32,
    pub character_count: u32,
}

/// 项目数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub config: ProjectConfig,
    pub document_content: String,
    pub document_metadata: DocumentMetadata,
    pub commits: Vec<CommitInfo>,
    pub commit_data: HashMap<String, String>, // commit_id -> document_content
}

/// 文件系统管理器
pub struct FileSystemManager {
    projects_dir: PathBuf,
}

impl FileSystemManager {
    /// 创建新的文件系统管理器
    pub fn new() -> Result<Self> {
        let projects_dir = Self::get_projects_directory()?;
        
        // 确保项目目录存在
        if !projects_dir.exists() {
            fs::create_dir_all(&projects_dir)
                .context("Failed to create projects directory")?;
        }

        Ok(Self { projects_dir })
    }

    /// 获取项目存储目录
    fn get_projects_directory() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .context("Failed to get home directory")?;
        
        Ok(home_dir.join(".branchwrite").join("projects"))
    }

    /// 创建新项目
    pub fn create_project(&self, name: &str, description: &str, author: &str) -> Result<ProjectData> {
        let project_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let config = ProjectConfig {
            id: project_id.clone(),
            name: name.to_string(),
            description: description.to_string(),
            created_at: now,
            last_modified: now,
            version: "1.0.0".to_string(),
            author: author.to_string(),
            settings: ProjectSettings::default(),
        };

        let document_metadata = DocumentMetadata {
            id: Uuid::new_v4().to_string(),
            title: format!("{} - 主文档", name),
            created_at: now,
            last_modified: now,
            word_count: 0,
            character_count: 0,
            line_count: 1,
            tags: vec![],
        };

        let project_data = ProjectData {
            config,
            document_content: String::new(),
            document_metadata,
            commits: vec![],
            commit_data: HashMap::new(),
        };

        // 创建项目目录
        let project_dir = self.projects_dir.join(&project_id);
        fs::create_dir_all(&project_dir)
            .context("Failed to create project directory")?;

        // 保存项目数据
        self.save_project(&project_data)?;

        Ok(project_data)
    }

    /// 保存项目数据
    pub fn save_project(&self, project_data: &ProjectData) -> Result<()> {
        let project_dir = self.projects_dir.join(&project_data.config.id);
        
        // 保存项目配置
        let config_path = project_dir.join("config.json");
        let config_json = serde_json::to_string_pretty(&project_data.config)
            .context("Failed to serialize project config")?;
        fs::write(&config_path, config_json)
            .context("Failed to write project config")?;

        // 保存文档内容
        let content_path = project_dir.join("document.md");
        fs::write(&content_path, &project_data.document_content)
            .context("Failed to write document content")?;

        // 保存文档元数据
        let metadata_path = project_dir.join("metadata.json");
        let metadata_json = serde_json::to_string_pretty(&project_data.document_metadata)
            .context("Failed to serialize document metadata")?;
        fs::write(&metadata_path, metadata_json)
            .context("Failed to write document metadata")?;

        // 保存提交历史
        let commits_path = project_dir.join("commits.json");
        let commits_json = serde_json::to_string_pretty(&project_data.commits)
            .context("Failed to serialize commits")?;
        fs::write(&commits_path, commits_json)
            .context("Failed to write commits")?;

        // 保存提交数据
        let commits_dir = project_dir.join("commit_data");
        if !commits_dir.exists() {
            fs::create_dir_all(&commits_dir)
                .context("Failed to create commit data directory")?;
        }

        for (commit_id, content) in &project_data.commit_data {
            let commit_file = commits_dir.join(format!("{}.md", commit_id));
            fs::write(&commit_file, content)
                .context("Failed to write commit data")?;
        }

        Ok(())
    }

    /// 加载项目数据
    pub fn load_project(&self, project_id: &str) -> Result<ProjectData> {
        let project_dir = self.projects_dir.join(project_id);
        
        if !project_dir.exists() {
            return Err(anyhow::anyhow!("Project not found: {}", project_id));
        }

        // 加载项目配置
        let config_path = project_dir.join("config.json");
        let config_json = fs::read_to_string(&config_path)
            .context("Failed to read project config")?;
        let config: ProjectConfig = serde_json::from_str(&config_json)
            .context("Failed to parse project config")?;

        // 加载文档内容
        let content_path = project_dir.join("document.md");
        let document_content = fs::read_to_string(&content_path)
            .unwrap_or_default();

        // 加载文档元数据
        let metadata_path = project_dir.join("metadata.json");
        let metadata_json = fs::read_to_string(&metadata_path)
            .context("Failed to read document metadata")?;
        let document_metadata: DocumentMetadata = serde_json::from_str(&metadata_json)
            .context("Failed to parse document metadata")?;

        // 加载提交历史
        let commits_path = project_dir.join("commits.json");
        let commits = if commits_path.exists() {
            let commits_json = fs::read_to_string(&commits_path)
                .context("Failed to read commits")?;
            serde_json::from_str(&commits_json)
                .context("Failed to parse commits")?
        } else {
            vec![]
        };

        // 加载提交数据
        let commits_dir = project_dir.join("commit_data");
        let mut commit_data = HashMap::new();
        
        if commits_dir.exists() {
            for entry in fs::read_dir(&commits_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.extension().and_then(|s| s.to_str()) == Some("md") {
                    let commit_id = path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or_default()
                        .to_string();
                    
                    let content = fs::read_to_string(&path)
                        .unwrap_or_default();
                    
                    commit_data.insert(commit_id, content);
                }
            }
        }

        Ok(ProjectData {
            config,
            document_content,
            document_metadata,
            commits,
            commit_data,
        })
    }

    /// 列出所有项目
    pub fn list_projects(&self) -> Result<Vec<ProjectConfig>> {
        let mut projects = Vec::new();

        if !self.projects_dir.exists() {
            return Ok(projects);
        }

        for entry in fs::read_dir(&self.projects_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                let config_path = path.join("config.json");
                if config_path.exists() {
                    match fs::read_to_string(&config_path) {
                        Ok(config_json) => {
                            if let Ok(config) = serde_json::from_str::<ProjectConfig>(&config_json) {
                                projects.push(config);
                            }
                        }
                        Err(_) => continue,
                    }
                }
            }
        }

        // 按最后修改时间排序
        projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

        Ok(projects)
    }

    /// 删除项目
    pub fn delete_project(&self, project_id: &str) -> Result<()> {
        let project_dir = self.projects_dir.join(project_id);
        
        if project_dir.exists() {
            fs::remove_dir_all(&project_dir)
                .context("Failed to delete project directory")?;
        }

        Ok(())
    }

    /// 导出项目
    pub fn export_project(&self, project_id: &str, export_path: &Path) -> Result<()> {
        let project_data = self.load_project(project_id)?;
        
        // 创建导出目录
        fs::create_dir_all(export_path)
            .context("Failed to create export directory")?;

        // 导出主文档
        let main_doc_path = export_path.join("document.md");
        fs::write(&main_doc_path, &project_data.document_content)
            .context("Failed to export main document")?;

        // 导出项目信息
        let project_info = format!(
            "# {}\n\n{}\n\n**作者**: {}\n**创建时间**: {}\n**最后修改**: {}\n\n",
            project_data.config.name,
            project_data.config.description,
            project_data.config.author,
            project_data.config.created_at.format("%Y-%m-%d %H:%M:%S"),
            project_data.config.last_modified.format("%Y-%m-%d %H:%M:%S")
        );
        
        let info_path = export_path.join("project_info.md");
        fs::write(&info_path, project_info)
            .context("Failed to export project info")?;

        // 导出版本历史
        if !project_data.commits.is_empty() {
            let history_dir = export_path.join("version_history");
            fs::create_dir_all(&history_dir)
                .context("Failed to create history directory")?;

            for commit in &project_data.commits {
                if let Some(content) = project_data.commit_data.get(&commit.id) {
                    let commit_file = history_dir.join(format!("{}.md", commit.id));
                    let commit_content = format!(
                        "# 版本: {}\n\n**时间**: {}\n**类型**: {}\n**字数**: {}\n\n---\n\n{}",
                        commit.message,
                        commit.timestamp.format("%Y-%m-%d %H:%M:%S"),
                        if commit.is_auto_commit { "自动保存" } else { "手动保存" },
                        commit.word_count,
                        content
                    );
                    fs::write(&commit_file, commit_content)
                        .context("Failed to export commit")?;
                }
            }
        }

        Ok(())
    }

    /// 获取项目统计信息
    pub fn get_project_stats(&self, project_id: &str) -> Result<HashMap<String, serde_json::Value>> {
        let project_data = self.load_project(project_id)?;
        let mut stats = HashMap::new();

        stats.insert("total_commits".to_string(), serde_json::Value::Number(project_data.commits.len().into()));
        stats.insert("auto_commits".to_string(), serde_json::Value::Number(
            project_data.commits.iter().filter(|c| c.is_auto_commit).count().into()
        ));
        stats.insert("manual_commits".to_string(), serde_json::Value::Number(
            project_data.commits.iter().filter(|c| !c.is_auto_commit).count().into()
        ));
        stats.insert("current_word_count".to_string(), serde_json::Value::Number(
            project_data.document_metadata.word_count.into()
        ));
        stats.insert("current_character_count".to_string(), serde_json::Value::Number(
            project_data.document_metadata.character_count.into()
        ));
        stats.insert("current_line_count".to_string(), serde_json::Value::Number(
            project_data.document_metadata.line_count.into()
        ));

        Ok(stats)
    }
}
