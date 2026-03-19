#!/bin/bash

# 房地产成本收益测算系统 - 部署辅助脚本
# 此脚本帮助您准备部署所需的所有信息

echo "🚀 房地产成本收益测算系统 - 部署准备工具"
echo "======================================="
echo ""

# 检查是否已安装必要工具
echo "🔍 检查部署工具..."

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 未安装"
        return 1
    else
        echo "✅ $1 已安装"
        return 0
    fi
}

check_command git
check_command node
check_command npm

if command -v pnpm &> /dev/null; then
    echo "✅ pnpm 已安装"
    PACKAGE_MANAGER="pnpm"
else
    PACKAGE_MANAGER="npm"
fi

echo ""
echo "📦 包管理器: $PACKAGE_MANAGER"
echo ""

# 检查项目结构
echo "🔍 检查项目结构..."

if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 不存在，请在backend目录下运行此脚本"
    exit 1
fi

# 安装依赖
echo ""
echo "📦 安装后端依赖..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install @supabase/supabase-js
else
    npm install @supabase/supabase-js
fi

echo "✅ 依赖安装完成"
echo ""

# 检查环境配置
echo "🔍 检查环境配置..."

if [ -f ".env" ]; then
    echo "⚠️  .env 文件已存在，请确保不包含敏感信息"
else
    echo "✅ .env 文件不存在 (将在部署时配置)"
fi

if [ -f ".env.example" ]; then
    echo "✅ .env.example 文件存在"
else
    echo "❌ .env.example 文件不存在"
fi

echo ""
echo "📋 Supabase配置信息收集"
echo "======================================="
echo ""
echo "请在以下位置获取您的Supabase项目信息："
echo "1. 访问 https://supabase.com"
echo "2. 登录并创建新项目"
echo "3. 进入项目设置 → API"
echo "4. 复制 Project URL 和 anon key"
echo ""

echo "请输入您的Supabase项目信息 (按Enter跳过):"
echo ""

read -p "Supabase Project URL (如: https://xxxxxxxxxxxxx.supabase.co): " supabase_url
read -p "Supabase Anon Key (如: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...): " supabase_key
read -p "JWT Secret (随机生成或输入): " jwt_secret

echo ""
echo "📝 环境变量配置"
echo "======================================="
echo ""

if [ ! -z "$supabase_url" ]; then
    echo "SUPABASE_URL=$supabase_url"
fi
if [ ! -z "$supabase_key" ]; then
    echo "SUPABASE_ANON_KEY=$supabase_key"
fi
if [ ! -z "$jwt_secret" ]; then
    echo "JWT_SECRET=$jwt_secret"
fi
echo "NODE_ENV=production"
echo "LOG_LEVEL=info"

echo ""
echo "💡 部署提示"
echo "======================================="
echo ""
echo "✅ 第一步: Supabase设置"
echo "   - 注册账户并创建项目"
echo "   - 执行SQL迁移脚本"
echo "   - 创建Storage存储桶"
echo ""
echo "✅ 第二步: Vercel部署"
echo "   - 导入GitHub仓库"
echo "   - 配置环境变量"
echo "   - 启动部署"
echo ""
echo "✅ 第三步: 验证和测试"
echo "   - 测试API端点"
echo "   - 验证前端功能"
echo "   - 检查数据库连接"
echo ""

echo "📚 详细部署指南"
echo "======================================="
echo ""
echo "请查看以下文档获取详细步骤："
echo "• DEPLOYMENT_GUIDE.md - 完整部署指南"
echo "• DEPLOYMENT_CHECKLIST.md - 部署检查清单"
echo ""

echo "🔗 有用的链接"
echo "======================================="
echo ""
echo "• Supabase: https://supabase.com/docs"
echo "• Vercel: https://vercel.com/docs"
echo "• 项目API文档: 部署后访问 /api-docs"
echo ""

echo "✨ 准备工作完成！"
echo ""
echo "下一步："
echo "1. 按照 DEPLOYMENT_GUIDE.md 开始部署"
echo "2. 使用此脚本输出的环境变量配置Vercel"
echo "3. 完成部署后运行功能测试"
echo ""
echo "祝您部署顺利！🚀"