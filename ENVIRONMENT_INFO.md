# 环境说明

## 当前运行环境

这个应用支持两种运行环境：

### 1. Web 环境（浏览器）
- **检测方式**: `window.__TAURI__` 不存在
- **存储方式**: 使用浏览器的 localStorage
- **适用场景**: 开发调试、在线演示
- **数据位置**: 浏览器本地存储（可通过开发者工具查看）

### 2. Tauri 环境（桌面应用）
- **检测方式**: `window.__TAURI__` 存在
- **存储方式**: 使用文件系统
- **适用场景**: 生产环境、桌面应用
- **数据位置**: 用户文档目录

## 当前状态

根据控制台输出判断：
- 如果看到 `🌐 FileSystemService: 使用 Web 环境（localStorage）`
  - 说明正在使用浏览器环境
  - 数据保存在 localStorage 中
  - 这是**正常的开发模式**

- 如果看到 `🖥️ FileSystemService: 使用 Tauri 环境（文件系统）`
  - 说明正在使用 Tauri 桌面应用
  - 数据保存在文件系统中

## Web 环境下的数据存储

在 Web 环境下，所有数据都存储在 localStorage 中：

### 存储键名格式：
- `branchwrite_projects` - 所有书籍/项目列表
- `branchwrite_documents_{bookId}` - 某本书的文档列表
- `branchwrite_content_{bookId}_{documentId}` - 某个文档的内容

### 查看数据：
1. 打开浏览器开发者工具（F12）
2. 切换到 Application 或 Storage 标签
3. 展开 Local Storage
4. 选择你的网站域名
5. 查看所有 `branchwrite_` 开头的键

### 清空数据：
- 使用测试页面：访问 `/test-document-creation.html`，点击"清空所有数据"
- 手动清空：在开发者工具的 Console 中执行：
  ```javascript
  Object.keys(localStorage)
    .filter(key => key.startsWith('branchwrite_'))
    .forEach(key => localStorage.removeItem(key))
  ```

## 这不是"模拟"

Web 环境下使用 localStorage 是**真实的数据存储**，不是模拟：
- ✅ 数据会持久化保存
- ✅ 刷新页面后数据仍然存在
- ✅ 可以正常创建、读取、更新、删除数据
- ⚠️  但数据只存在于当前浏览器中
- ⚠️  清除浏览器数据会丢失所有内容

## 切换到 Tauri 环境

如果需要使用文件系统存储，需要：
1. 安装 Rust 和 Tauri CLI
2. 运行 `npm run tauri dev` 启动 Tauri 开发模式
3. 或者构建桌面应用：`npm run tauri build`

## 调试建议

1. **确认环境**：查看控制台是否有 `🌐 使用 Web 环境` 的日志
2. **检查存储**：使用测试页面或开发者工具查看 localStorage
3. **测试流程**：按照 DEBUG_DOCUMENT_CREATION.md 中的步骤进行调试
