# 文档创建功能调试指南

## 问题描述
左侧文档列表的"新建"按钮无法创建文档。

## 已添加的调试功能

### 1. 控制台日志
在以下关键位置添加了详细的 console.log：

#### DocumentList.vue
- `handleShowCreateDialog()` - 点击新建按钮时
- `handleCreateDocument()` - 提交创建文档时
- `handleSelectDocument()` - 选择文档时
- `handleDeleteDocument()` - 删除文档时

#### CreateDocumentDialog.vue
- `handleSubmit()` - 表单提交时

#### app.ts (Store)
- `createDocument()` - 创建文档的 store 方法
- `loadBook()` - 加载书籍时

#### webAdapter.ts
- `createDocument()` - Web 环境下创建文档的底层方法

### 2. 测试页面
创建了 `public/test-document-creation.html` 测试页面，可以：
- 创建测试书籍
- 创建测试文档
- 查看 LocalStorage 中的所有数据
- 清空所有测试数据

访问方式：`http://localhost:5173/test-document-creation.html`

## 调试步骤

### 步骤 1: 打开开发者工具
1. 按 F12 或 Cmd+Option+I 打开浏览器开发者工具
2. 切换到 Console 标签页

### 步骤 2: 尝试创建文档
1. 在应用中选择一本书籍
2. 点击左侧文档列表的"新建"按钮
3. 填写文档标题和类型
4. 点击"创建文档"按钮

### 步骤 3: 查看控制台输出
按照以下顺序查看日志：

```
🔘 点击新建按钮
📚 当前书籍: [书籍名称]
📄 当前文档数量: [数量]

📋 对话框: 开始提交表单
✅ 对话框: 表单验证通过 {title: "...", type: "..."}
✅ 对话框: 已触发 submit 事件

📝 开始创建文档: {title: "...", type: "..."}
📚 当前书籍ID: [bookId]

🏪 Store: 开始创建文档 {bookId: "...", title: "...", docType: "..."}

💾 WebAdapter: 开始创建文档 {projectId: "...", title: "...", docType: "..."}
💾 WebAdapter: 当前文档数量 [数量]
💾 WebAdapter: 文档已保存到 localStorage branchwrite_documents_[bookId]

🏪 Store: 文档创建成功 {id: "...", title: "...", ...}
🏪 Store: 文档列表已更新 [新数量]

✅ 文档创建成功: [documentId]
📄 更新后的文档列表: [...]
```

### 步骤 4: 使用测试页面验证
1. 访问 `http://localhost:5173/test-document-creation.html`
2. 点击"创建测试书籍"
3. 点击"创建文档"
4. 点击"显示所有数据"查看 LocalStorage

## 可能的问题点

### 1. 书籍未正确加载
- 检查 `currentBook.value` 是否为 null
- 检查 `currentBook.value?.config.id` 是否存在

### 2. 对话框未正确触发
- 检查 `showCreateDialog` 的值变化
- 检查表单验证是否通过

### 3. Store 方法未执行
- 检查 `app.createDocument` 是否被调用
- 检查是否有异常抛出

### 4. LocalStorage 写入失败
- 检查浏览器是否禁用了 LocalStorage
- 检查是否有存储空间限制

### 5. 响应式更新失败
- 检查 `documents.value` 是否正确更新
- 检查 Vue 的响应式系统是否正常工作

## 预期行为

创建文档成功后：
1. 文档应该出现在左侧文档列表中
2. LocalStorage 中应该有对应的记录
3. 控制台应该显示成功日志
4. 对话框应该自动关闭

## 清理调试代码

调试完成后，可以移除以下内容：
- 所有 `console.log` 语句
- `public/test-document-creation.html` 文件
- 本文档 `DEBUG_DOCUMENT_CREATION.md`
