# BranchWrite1 版本管理指南

## 🎯 当前状态

✅ **已完成**：
- Git 仓库初始化
- 初始提交 (commit: 82a200c)
- 远程仓库配置: `https://github.com/Golenspadel/BRANCHWRITE.git`
- 版本管理脚本创建

🔄 **待完成**：
- 推送到 GitHub（需要身份验证）

## 🚀 推送到 GitHub

### 方法1: 使用 npm 脚本（推荐）

```bash
npm run push
```

### 方法2: 使用版本管理脚本

```bash
./scripts/push-to-github.sh
```

### 方法3: 手动推送

```bash
git push -u origin main
```

## 🔐 身份验证解决方案

### 选项1: GitHub CLI（最简单）

1. 安装 GitHub CLI：
   ```bash
   brew install gh  # macOS
   ```

2. 登录：
   ```bash
   gh auth login
   ```

3. 推送：
   ```bash
   git push -u origin main
   ```

### 选项2: 个人访问令牌

1. 创建令牌：
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择权限：`repo`
   - 复制令牌

2. 使用令牌推送：
   ```bash
   git push https://ghp_YOUR_TOKEN@github.com/Golenspadel/BRANCHWRITE.git main
   ```

### 选项3: SSH 密钥

1. 生成 SSH 密钥：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. 添加到 GitHub：
   - 复制公钥：`cat ~/.ssh/id_ed25519.pub`
   - 在 GitHub Settings > SSH keys 中添加

3. 更改远程 URL：
   ```bash
   git remote set-url origin git@github.com:Golenspadel/BRANCHWRITE.git
   git push -u origin main
   ```

## 📦 版本发布管理

### 快速版本发布

```bash
# 补丁版本 (1.0.0 -> 1.0.1)
npm run version:patch

# 次要版本 (1.0.0 -> 1.1.0)
npm run version:minor

# 主要版本 (1.0.0 -> 2.0.0)
npm run version:major
```

### 使用版本管理脚本

```bash
# 创建补丁版本
./scripts/version-management.sh patch "修复比对功能bug"

# 创建次要版本
./scripts/version-management.sh minor "添加新的编辑器功能"

# 创建主要版本
./scripts/version-management.sh major "重大架构更新"

# 自定义版本
./scripts/version-management.sh custom v2.1.0-beta

# 查看版本历史
./scripts/version-management.sh history

# 检查状态
./scripts/version-management.sh status
```

## 🔄 日常开发工作流

### 1. 开发新功能

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 开发和提交
git add .
git commit -m "feat: 添加新功能"

# 合并到主分支
git checkout main
git merge feature/new-feature
```

### 2. 修复 Bug

```bash
# 创建修复分支
git checkout -b fix/bug-description

# 修复和提交
git add .
git commit -m "fix: 修复比对功能问题"

# 合并到主分支
git checkout main
git merge fix/bug-description
```

### 3. 发布版本

```bash
# 确保在主分支
git checkout main

# 创建版本（自动推送）
npm run version:patch  # 或 minor/major

# 或使用脚本
./scripts/version-management.sh patch "版本说明"
```

## 📋 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 类型说明

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例

```bash
git commit -m "feat: 添加版本对比功能"
git commit -m "fix: 修复自动保存问题"
git commit -m "docs: 更新 README 文档"
git commit -m "refactor: 重构 diff 算法"
```

## 🏷️ 版本号规范

使用 [Semantic Versioning](https://semver.org/) 规范：

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能性新增
- **PATCH**: 向下兼容的问题修正

### 当前版本计划

- `v1.0.0`: 初始发布版本
- `v1.1.0`: 添加协作功能
- `v1.2.0`: 添加云端同步
- `v2.0.0`: 重大架构升级

## 🔧 故障排除

### 推送失败

1. **网络问题**：
   ```bash
   # 检查网络连接
   ping github.com
   
   # 使用代理（如果需要）
   git config --global http.proxy http://proxy.example.com:8080
   ```

2. **身份验证问题**：
   - 检查 GitHub 登录状态
   - 重新生成个人访问令牌
   - 使用 SSH 密钥

3. **权限问题**：
   - 确认对仓库有写权限
   - 检查令牌权限范围

### 版本冲突

```bash
# 查看冲突
git status

# 解决冲突后
git add .
git commit -m "resolve: 解决版本冲突"
```

## 📞 获取帮助

```bash
# 查看 Git 状态
git status

# 查看提交历史
git log --oneline -10

# 查看远程仓库
git remote -v

# 使用版本管理脚本帮助
./scripts/version-management.sh help
```

---

**记住**：在推送之前，请确保已经完成 GitHub 身份验证！🔐
