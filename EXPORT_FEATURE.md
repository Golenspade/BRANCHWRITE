# 导出功能说明

## 功能概述

BranchWrite 现在支持灵活的文档导出功能，可以导出单个文档或整本书。

**智能环境适配**：导出功能会自动检测运行环境，在 Tauri 桌面应用中使用原生文件对话框，在 Web 浏览器中使用浏览器下载。

## 使用方法

### 1. 打开导出对话框

在书籍工作区界面，点击顶部工具栏的"导出"按钮。

### 2. 选择导出选项

#### 导出范围
- **当前文档**: 仅导出当前正在编辑的文档
- **整本书**: 导出书籍中的所有文档

#### 导出格式
- **Markdown (.md)**: 保留 Markdown 格式
- **纯文本 (.txt)**: 纯文本格式

#### 合并选项（仅在导出整本书时可用）
- **合并为单个文件**: 所有文档合并为一个文件，每个文档作为一个章节
- **分别导出**: 每个文档导出为单独的文件

### 3. 点击导出

点击"导出"按钮后，浏览器会自动下载文件。

## 导出文件命名规则

- **单个文档**: `文档标题.扩展名`
- **合并的书籍**: `书籍名称.扩展名`
- **分别导出**: `书籍名称_文档标题.扩展名`

## 技术实现

### 环境检测与适配

导出功能通过 `FileSystemService` 统一接口，自动适配不同环境：

```typescript
static async exportDocument(filename: string, content: string, format: string) {
  if (!isTauriEnvironment()) {
    // Web 环境：使用浏览器下载
    return await WebFileSystemAdapter.exportDocument(filename, content, format)
  }
  
  // Tauri 环境：使用原生文件对话框
  const { save } = await import('@tauri-apps/plugin-dialog')
  const filePath = await save({ defaultPath: filename, filters })
  if (filePath) {
    await FileSystemService.writeFile(filePath, content)
  }
}
```

### Web 环境实现

使用浏览器的 Blob API 和下载机制：

```typescript
// 创建 Blob 对象
const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })

// 创建下载链接
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = filename
link.click()

// 清理
URL.revokeObjectURL(url)
```

### Tauri 环境实现

使用原生文件系统 API：

```typescript
// 显示原生保存对话框
const { save } = await import('@tauri-apps/plugin-dialog')
const filePath = await save({
  defaultPath: filename,
  filters: [{ name: 'Markdown', extensions: ['md'] }]
})

// 保存文件到用户选择的路径
if (filePath) {
  await writeFile(filePath, content)
}
```

## 环境差异

| 特性 | Web 环境 | Tauri 桌面环境 |
|------|---------|---------------|
| 文件对话框 | 浏览器默认下载 | 原生系统对话框 |
| 保存位置 | 浏览器下载文件夹 | 用户选择任意位置 |
| 批量导出 | 多次下载提示 | 多次选择保存位置 |
| 文件覆盖 | 浏览器处理 | 系统对话框确认 |
| 用户体验 | 简单快速 | 更灵活可控 |

## 相关文件

- `src/components/workspace/ExportDialog.vue` - 导出对话框组件
- `src/components/workspace/BookWorkspace.vue` - 工作区主界面
- `src/services/fileSystemService.ts` - 文件系统服务（统一接口）
- `src/services/webAdapter.ts` - Web 环境适配器（浏览器下载实现）

## 依赖

### 前端
- `@tauri-apps/plugin-dialog` - Tauri 文件对话框插件

### 后端 (Rust)
- `tauri-plugin-dialog` - Tauri 文件对话框插件
- `tauri-plugin-fs` - Tauri 文件系统插件

## 未来改进

- [ ] 支持更多导出格式（PDF, DOCX, EPUB）
- [ ] 支持自定义导出模板
- [ ] 支持导出时包含版本历史
- [ ] 支持批量导出多本书
- [ ] 支持导出到云存储服务
