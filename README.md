# BranchWrite1 📝

> 专为作家设计的 SOTA 级别写作软件，融合 Git 风格版本管理与专业 Diff 对比功能

![BranchWrite1](https://img.shields.io/badge/BranchWrite1-v1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.1.1-orange.svg)

## ✨ 核心特性

### 🔄 Git 风格版本管理
- **手动版本保存**: 用户可以手动保存版本并添加说明
- **自动保存**: 每30秒自动保存一次（如果内容有变化）
- **版本历史**: 显示所有版本的时间线和说明
- **版本切换**: 点击版本可以切换到该版本的内容

### 📊 专业 Diff 对比
- **逐行对比**: 精确的逐行文本对比算法
- **并排显示**: 左侧显示旧版本，右侧显示新版本
- **颜色区分**: 红色删除，绿色新增，白色未变
- **行号显示**: 每行都有行号便于定位
- **变更标记**: 删除行前有 "-"，新增行前有 "+"

### 📝 强大编辑器
- **三种模式**: 编辑 | 预览 | 对比
- **Markdown 支持**: 完整的 Markdown 语法支持和渲染
- **实时统计**: 字符数、字数、行数统计

### 🔍 搜索和替换
- **文本搜索**: 快速查找文本内容
- **替换功能**: 单个替换或全部替换
- **快捷操作**: 支持键盘快捷键

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Rust 1.70+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
npm run build
```

### 构建桌面应用
```bash
npm run tauri build
```

## ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + S` | 保存版本 |
| `Ctrl/Cmd + 1` | 切换到编辑模式 |
| `Ctrl/Cmd + 2` | 切换到预览模式 |
| `Ctrl/Cmd + 3` | 切换到对比模式 |
| `Ctrl/Cmd + H` | 切换版本历史面板 |
| `Ctrl/Cmd + F` | 打开搜索面板 |

## 🎯 使用场景

- 📚 小说和长篇写作
- 📝 技术文档编写
- 🎓 学术论文写作
- 💼 内容创作和编辑

## 🛠️ 技术栈

- **前端**: React 19 + TypeScript + Vite
- **桌面**: Tauri 2.0
- **样式**: CSS Modules + Tailwind CSS
- **Markdown**: marked
- **版本管理**: 自实现的 Git 风格系统


## 🕒 时间线（Timeline）

- 当前状态
  - 已实现：
    - 从提交历史构建时间线（节点/连接/分支）并以 SVG 渲染
    - 平移、缩放、节点点击/双击、背景点击、网格显示/隐藏
    - 基础搜索（按消息/标签/分支），统计信息（总节点/分支、时间跨度、日均提交）
  - 待完善（MVP 路线）：
    - 视图：一键缩放至全图（fit to bounds）、tooltip 悬浮信息、键盘导航、多选
    - 联动：双击打开版本详情、右键 Diff、回滚到某提交并与文档管理联动
    - 持久化：Web 端 localStorage、Tauri 端文件读写，初始化加载与操作后的延迟写入
    - 搜索/筛选：时间范围、分支过滤与视图高亮聚焦

- 相关代码
  - 模型：`src/models/TimelineManager.ts`
  - 类型：`src/types/timeline.ts`
  - 组件：`src/components/Timeline.tsx`（渲染）、`src/components/TimelineControls.tsx`（控制面板）、`src/components/TimelineView.tsx`（容器）
  - 演示与测试：`src/components/TimelineDemo.tsx`、`src/test/TimelineTest.ts`

- 路线图与待办
  - 详见 `todolist.md` 中“最小持久化”“Phase 1 时间线 MVP”等条目


## 📖 文档

- [功能特性详解](./FEATURES.md)
- [演示指南](./DEMO.md)
- [测试说明](./test-diff.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**BranchWrite1** - 让写作变得更专业 ✨
# BRANCHWRITE
