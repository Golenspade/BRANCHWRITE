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

/// 书籍配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub genre: String,
    pub created_at: DateTime<Utc>,
    pub last_modified: DateTime<Utc>,
    pub cover_image: Option<String>,
    pub tags: Vec<String>,
    pub settings: BookSettings,
}

/// 书籍设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookSettings {
    pub outline_enabled: bool,
    pub timeline_enabled: bool,
    pub auto_save_interval: u32, // 分钟
    pub target_word_count: Option<u32>,
    pub deadline: Option<DateTime<Utc>>,
    pub editor_theme: String,
    pub font_size: u32,
    pub line_height: u32,
    pub font_family: String,
}

impl Default for BookSettings {
    fn default() -> Self {
        Self {
            outline_enabled: true,
            timeline_enabled: true,
            auto_save_interval: 5,
            target_word_count: None,
            deadline: None,
            editor_theme: "focus-writing".to_string(),
            font_size: 14,
            line_height: 24,
            font_family: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace".to_string(),
        }
    }
}

/// 文档配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentConfig {
    pub id: String,
    pub book_id: String,
    pub title: String,
    pub order: u32,
    pub doc_type: String, // 'chapter' | 'section' | 'note'
    pub created_at: DateTime<Utc>,
    pub last_modified: DateTime<Utc>,
    pub word_count: u32,
    pub character_count: u32,
    pub status: String, // 'draft' | 'review' | 'final'
}

/// 书籍数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookData {
    pub config: BookConfig,
    pub documents: Vec<DocumentConfig>,
    pub current_document_id: Option<String>,
}

/// 项目数据结构（保持向后兼容）
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
    books_dir: PathBuf,
}

impl FileSystemManager {
    /// 创建新的文件系统管理器
    pub fn new() -> Result<Self> {
        let projects_dir = Self::get_projects_directory()?;
        let books_dir = Self::get_books_directory()?;

        // 确保项目目录存在
        if !projects_dir.exists() {
            fs::create_dir_all(&projects_dir)
                .context("Failed to create projects directory")?;
        }

        // 确保书籍目录存在
        if !books_dir.exists() {
            fs::create_dir_all(&books_dir)
                .context("Failed to create books directory")?;
        }

        Ok(Self { projects_dir, books_dir })
    }

    /// 获取项目存储目录
    fn get_projects_directory() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .context("Failed to get home directory")?;

        Ok(home_dir.join(".branchwrite").join("projects"))
    }

    /// 获取书籍存储目录
    fn get_books_directory() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .context("Failed to get home directory")?;

        Ok(home_dir.join(".branchwrite").join("books"))
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

    // ===== 书籍管理方法 =====

    /// 创建新书籍
    pub fn create_book(&self, name: &str, description: &str, author: &str, genre: &str) -> Result<BookData> {
        let book_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let config = BookConfig {
            id: book_id.clone(),
            name: name.to_string(),
            description: description.to_string(),
            author: author.to_string(),
            genre: genre.to_string(),
            created_at: now,
            last_modified: now,
            cover_image: None,
            tags: vec![],
            settings: BookSettings::default(),
        };

        let book_data = BookData {
            config,
            documents: vec![],
            current_document_id: None,
        };

        // 创建书籍目录
        let book_dir = self.books_dir.join(&book_id);
        fs::create_dir_all(&book_dir)
            .context("Failed to create book directory")?;

        // 创建文档目录
        let documents_dir = book_dir.join("documents");
        fs::create_dir_all(&documents_dir)
            .context("Failed to create documents directory")?;

        // 保存书籍数据
        self.save_book(&book_data)?;

        Ok(book_data)
    }

    /// 保存书籍数据
    pub fn save_book(&self, book_data: &BookData) -> Result<()> {
        let book_dir = self.books_dir.join(&book_data.config.id);

        // 保存书籍配置
        let config_path = book_dir.join("config.json");
        let config_json = serde_json::to_string_pretty(&book_data.config)
            .context("Failed to serialize book config")?;
        fs::write(&config_path, config_json)
            .context("Failed to write book config")?;

        // 保存文档列表
        let documents_path = book_dir.join("documents.json");
        let documents_json = serde_json::to_string_pretty(&book_data.documents)
            .context("Failed to serialize documents list")?;
        fs::write(&documents_path, documents_json)
            .context("Failed to write documents list")?;

        // 保存当前文档ID
        if let Some(current_doc_id) = &book_data.current_document_id {
            let current_doc_path = book_dir.join("current_document.txt");
            fs::write(&current_doc_path, current_doc_id)
                .context("Failed to write current document ID")?;
        }

        Ok(())
    }

    /// 加载书籍数据
    pub fn load_book(&self, book_id: &str) -> Result<BookData> {
        let book_dir = self.books_dir.join(book_id);

        if !book_dir.exists() {
            return Err(anyhow::anyhow!("Book not found: {}", book_id));
        }

        // 加载书籍配置
        let config_path = book_dir.join("config.json");
        let config_json = fs::read_to_string(&config_path)
            .context("Failed to read book config")?;
        let config: BookConfig = serde_json::from_str(&config_json)
            .context("Failed to parse book config")?;

        // 加载文档列表
        let documents_path = book_dir.join("documents.json");
        let documents = if documents_path.exists() {
            let documents_json = fs::read_to_string(&documents_path)
                .context("Failed to read documents list")?;
            serde_json::from_str(&documents_json)
                .context("Failed to parse documents list")?
        } else {
            vec![]
        };

        // 加载当前文档ID
        let current_doc_path = book_dir.join("current_document.txt");
        let current_document_id = if current_doc_path.exists() {
            Some(fs::read_to_string(&current_doc_path)
                .context("Failed to read current document ID")?)
        } else {
            None
        };

        Ok(BookData {
            config,
            documents,
            current_document_id,
        })
    }

    /// 列出所有书籍
    pub fn list_books(&self) -> Result<Vec<BookConfig>> {
        let mut books = Vec::new();

        if !self.books_dir.exists() {
            return Ok(books);
        }

        let entries = fs::read_dir(&self.books_dir)
            .context("Failed to read books directory")?;

        for entry in entries {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();

            if path.is_dir() {
                let config_path = path.join("config.json");
                if config_path.exists() {
                    match fs::read_to_string(&config_path) {
                        Ok(config_json) => {
                            match serde_json::from_str::<BookConfig>(&config_json) {
                                Ok(config) => books.push(config),
                                Err(e) => eprintln!("Failed to parse book config: {}", e),
                            }
                        }
                        Err(e) => eprintln!("Failed to read book config: {}", e),
                    }
                }
            }
        }

        // 按最后修改时间排序
        books.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

        Ok(books)
    }

    /// 删除书籍
    pub fn delete_book(&self, book_id: &str) -> Result<()> {
        let book_dir = self.books_dir.join(book_id);

        if book_dir.exists() {
            fs::remove_dir_all(&book_dir)
                .context("Failed to delete book directory")?;
        }

        Ok(())
    }

    // ===== 文档管理方法 =====

    /// 创建新文档
    pub fn create_document(&self, book_id: &str, title: &str, doc_type: &str) -> Result<DocumentConfig> {
        let document_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        // 加载书籍数据以获取下一个顺序号
        let mut book_data = self.load_book(book_id)?;
        let next_order = book_data.documents.len() as u32 + 1;

        let document_config = DocumentConfig {
            id: document_id.clone(),
            book_id: book_id.to_string(),
            title: title.to_string(),
            order: next_order,
            doc_type: doc_type.to_string(),
            created_at: now,
            last_modified: now,
            word_count: 0,
            character_count: 0,
            status: "draft".to_string(),
        };

        // 创建文档目录
        let doc_dir = self.books_dir.join(book_id).join("documents").join(&document_id);
        fs::create_dir_all(&doc_dir)
            .context("Failed to create document directory")?;

        // 创建空的文档内容文件
        let content_path = doc_dir.join("content.md");
        fs::write(&content_path, "")
            .context("Failed to create document content file")?;

        // 保存文档元数据
        let metadata_path = doc_dir.join("metadata.json");
        let metadata_json = serde_json::to_string_pretty(&document_config)
            .context("Failed to serialize document metadata")?;
        fs::write(&metadata_path, metadata_json)
            .context("Failed to write document metadata")?;

        // 创建提交目录
        let commits_dir = doc_dir.join("commits");
        fs::create_dir_all(&commits_dir)
            .context("Failed to create commits directory")?;

        // 更新书籍的文档列表
        book_data.documents.push(document_config.clone());
        self.save_book(&book_data)?;

        Ok(document_config)
    }

    /// 加载文档内容
    pub fn load_document(&self, book_id: &str, document_id: &str) -> Result<String> {
        let content_path = self.books_dir
            .join(book_id)
            .join("documents")
            .join(document_id)
            .join("content.md");

        if !content_path.exists() {
            return Ok(String::new());
        }

        fs::read_to_string(&content_path)
            .context("Failed to read document content")
    }

    /// 保存文档内容
    pub fn save_document(&self, book_id: &str, document_id: &str, content: &str) -> Result<()> {
        let doc_dir = self.books_dir
            .join(book_id)
            .join("documents")
            .join(document_id);

        let content_path = doc_dir.join("content.md");
        fs::write(&content_path, content)
            .context("Failed to write document content")?;

        // 更新文档元数据
        let metadata_path = doc_dir.join("metadata.json");
        if metadata_path.exists() {
            let metadata_json = fs::read_to_string(&metadata_path)
                .context("Failed to read document metadata")?;
            let mut document_config: DocumentConfig = serde_json::from_str(&metadata_json)
                .context("Failed to parse document metadata")?;

            // 更新统计信息
            document_config.last_modified = Utc::now();
            document_config.character_count = content.len() as u32;
            document_config.word_count = content
                .split_whitespace()
                .filter(|word| !word.is_empty())
                .count() as u32;

            // 保存更新的元数据
            let updated_metadata_json = serde_json::to_string_pretty(&document_config)
                .context("Failed to serialize updated document metadata")?;
            fs::write(&metadata_path, updated_metadata_json)
                .context("Failed to write updated document metadata")?;
        }

        Ok(())
    }

    /// 列出书籍的所有文档
    pub fn list_documents(&self, book_id: &str) -> Result<Vec<DocumentConfig>> {
        let book_data = self.load_book(book_id)?;
        Ok(book_data.documents)
    }

    /// 删除文档
    pub fn delete_document(&self, book_id: &str, document_id: &str) -> Result<()> {
        // 删除文档目录
        let doc_dir = self.books_dir
            .join(book_id)
            .join("documents")
            .join(document_id);

        if doc_dir.exists() {
            fs::remove_dir_all(&doc_dir)
                .context("Failed to delete document directory")?;
        }

        // 从书籍的文档列表中移除
        let mut book_data = self.load_book(book_id)?;
        book_data.documents.retain(|doc| doc.id != document_id);

        // 如果删除的是当前文档，清除当前文档ID
        if book_data.current_document_id.as_ref() == Some(&document_id.to_string()) {
            book_data.current_document_id = None;
        }

        self.save_book(&book_data)?;

        Ok(())
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
