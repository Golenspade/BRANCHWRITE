#!/bin/bash

# BranchWrite1 版本管理脚本
# 使用方法: ./scripts/version-management.sh [command] [options]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查 Git 状态
check_git_status() {
    print_info "检查 Git 状态..."
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "当前目录不是 Git 仓库"
        exit 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        print_warning "有未提交的更改"
        git status --short
        return 1
    fi
    
    print_success "Git 状态正常"
    return 0
}

# 创建新版本
create_version() {
    local version_type=$1
    local message=$2
    
    print_info "创建新版本: $version_type"
    
    # 检查状态
    if ! check_git_status; then
        read -p "是否要提交当前更改? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            if [ -z "$message" ]; then
                read -p "请输入提交信息: " message
            fi
            git commit -m "$message"
        else
            print_error "请先处理未提交的更改"
            exit 1
        fi
    fi
    
    # 获取当前版本
    current_version=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    print_info "当前版本: $current_version"
    
    # 计算新版本号
    case $version_type in
        "major")
            new_version=$(echo $current_version | awk -F. '{printf "v%d.0.0", $1+1}' | sed 's/v//')
            ;;
        "minor")
            new_version=$(echo $current_version | awk -F. '{printf "v%d.%d.0", $1, $2+1}' | sed 's/v//')
            ;;
        "patch")
            new_version=$(echo $current_version | awk -F. '{printf "v%d.%d.%d", $1, $2, $3+1}' | sed 's/v//')
            ;;
        *)
            new_version=$version_type
            ;;
    esac
    
    new_version="v$new_version"
    print_info "新版本: $new_version"
    
    # 创建标签
    if [ -z "$message" ]; then
        message="Release $new_version"
    fi
    
    git tag -a "$new_version" -m "$message"
    print_success "已创建版本标签: $new_version"
    
    # 推送标签
    read -p "是否要推送到远程仓库? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin "$new_version"
        print_success "已推送版本标签到远程仓库"
    fi
}

# 推送到 GitHub
push_to_github() {
    print_info "推送到 GitHub..."
    
    # 检查远程仓库
    if ! git remote get-url origin > /dev/null 2>&1; then
        print_error "未配置远程仓库"
        print_info "请先运行: git remote add origin <repository-url>"
        exit 1
    fi
    
    remote_url=$(git remote get-url origin)
    print_info "远程仓库: $remote_url"
    
    # 推送主分支
    print_info "推送主分支..."
    if git push -u origin main; then
        print_success "主分支推送成功"
    else
        print_error "主分支推送失败"
        print_info "可能需要身份验证，请检查 GitHub 凭据"
        exit 1
    fi
    
    # 推送标签
    if git tag -l | grep -q "v"; then
        print_info "推送版本标签..."
        git push --tags
        print_success "版本标签推送成功"
    fi
}

# 显示版本历史
show_versions() {
    print_info "版本历史:"
    git tag -l --sort=-version:refname | head -10
    
    print_info "\n最近的提交:"
    git log --oneline -10
}

# 显示帮助信息
show_help() {
    echo "BranchWrite1 版本管理脚本"
    echo ""
    echo "用法:"
    echo "  $0 patch [message]     创建补丁版本 (x.x.X)"
    echo "  $0 minor [message]     创建次要版本 (x.X.0)"
    echo "  $0 major [message]     创建主要版本 (X.0.0)"
    echo "  $0 custom <version>    创建自定义版本"
    echo "  $0 push               推送到 GitHub"
    echo "  $0 status             检查 Git 状态"
    echo "  $0 history            显示版本历史"
    echo "  $0 help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 patch \"修复比对功能bug\""
    echo "  $0 minor \"添加新的编辑器功能\""
    echo "  $0 major \"重大架构更新\""
    echo "  $0 custom v2.1.0-beta"
}

# 主函数
main() {
    case ${1:-help} in
        "patch"|"minor"|"major")
            create_version "$1" "$2"
            ;;
        "custom")
            if [ -z "$2" ]; then
                print_error "请提供版本号"
                exit 1
            fi
            create_version "$2" "$3"
            ;;
        "push")
            push_to_github
            ;;
        "status")
            check_git_status
            ;;
        "history")
            show_versions
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"
