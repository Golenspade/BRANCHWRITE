#!/bin/bash

# 简单的 GitHub 推送脚本
# 使用方法: ./scripts/push-to-github.sh

echo "🚀 BranchWrite1 - 推送到 GitHub"
echo "================================"

# 检查 Git 状态
echo "📋 检查 Git 状态..."
git status

echo ""
echo "🔗 远程仓库配置:"
git remote -v

echo ""
echo "📦 准备推送的提交:"
git log --oneline -5

echo ""
read -p "确认推送到 GitHub? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 开始推送..."
    
    # 方法1: 尝试直接推送
    echo "尝试方法1: 直接推送"
    if git push -u origin main; then
        echo "✅ 推送成功!"
        exit 0
    fi
    
    echo "❌ 直接推送失败，可能需要身份验证"
    echo ""
    echo "🔐 身份验证选项:"
    echo "1. 使用 GitHub CLI: gh auth login"
    echo "2. 使用个人访问令牌"
    echo "3. 配置 SSH 密钥"
    echo ""
    echo "📖 详细说明:"
    echo "如果你有 GitHub CLI，运行: gh auth login"
    echo "如果你有个人访问令牌，运行:"
    echo "  git push https://ghp_YOUR_TOKEN@github.com/Golenspadel/BRANCHWRITE.git main"
    echo ""
    echo "或者在浏览器中访问 GitHub 并检查身份验证状态"
    
else
    echo "❌ 取消推送"
fi
