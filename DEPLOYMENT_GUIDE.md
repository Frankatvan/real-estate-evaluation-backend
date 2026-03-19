# 房地产成本收益测算系统 - 部署指南

## 📋 部署概述

本项目采用**混合部署方案**，充分利用各平台的优势：

### 部署架构

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   前端 (Vercel)│         │  后端 (Vercel) │         │ Supabase (免费)  │
│                 │◄──────►│                 │◄──────►│                 │
│ - React应用      │  API   │ - Express API    │  数据库  │ - PostgreSQL      │
│ - 静态文件     │        │ - 业务逻辑       │         │ - 认证服务       │
│ - SPA路由        │        │ - API端点       │         │ - 文件存储       │
│                 │        │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

**部署成本**: 完全免费 ✅
- Vercel: 免费版 (100GB流量/月)
- Supabase: 免费版 (500MB数据库, 1GB存储)

## 🚀 第一步：设置Supabase账户和项目

### 1.1 注册Supabase账户

1. 访问 [supabase.com](https://supabase.com)
2. 点击 "Start your project"
3. 使用邮箱或GitHub账户注册
4. 验证邮箱地址

### 1.2 创建新项目

1. 点击 "New Project"
2. 填写项目信息：
   - **Project Name**: `real-estate-evaluation`
   - **Database Password**: 设置强密码并保存
   - **Region**: 选择离您最近的区域 (如：Southeast Asia - Singapore)
3. 等待项目创建完成 (约1-2分钟)

### 1.3 获取项目凭据

1. 进入项目设置：
   - 点击左侧菜单 "Settings"
   - 选择 "API"
2. 记录以下信息：
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **重要**: 这些信息将在后续配置中使用

## 🗄️ 第二步：配置Supabase数据库

### 2.1 创建数据库表

有几种方法可以创建数据库表：

#### 方法A：使用Supabase SQL编辑器 (推荐)

1. 在Supabase控制台中，点击左侧菜单 "SQL Editor"
2. 点击 "New query"
3. 将项目中的SQL迁移文件内容复制粘贴到编辑器
4. 按顺序执行以下SQL文件：
   - `backend/src/migrations/create_users_table.sql`
   - `backend/src/migrations/create_projects_table.sql`
   - `backend/src/migrations/create_versions_table.sql`
   - `backend/src/migrations/create_file_uploads_table.sql`
   - 以及其他所有迁移文件...

#### 方法B：使用Supabase CLI (高级)

```bash
# 安装Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接到项目
supabase link --project-ref YOUR_PROJECT_REF

# 应用迁移
cd backend
supabase db push
```

### 2.2 创建Supabase Storage存储桶

1. 在Supabase控制台中，点击左侧菜单 "Storage"
2. 点击 "New bucket"
3. 创建存储桶：
   - **Name**: `project-files`
   - **Public bucket**: 取消勾选 (私有存储)
   - **File size limit**: 10MB
4. 设置存储桶策略：
   - 点击存储桶名称
   - "Policies" 标签页
   - 添加策略以允许用户上传自己的文件

### 2.3 配置Supabase Auth

1. 在Supabase控制台中，点击左侧菜单 "Authentication"
2. 在 "Providers" 标签页：
   - **Email**: 启用 (默认已启用)
3. 在 "URL Configuration" 标签页：
   - **Site URL**: 您的Vercel前端URL (如：https://your-app.vercel.app)
   - **Redirect URLs**: 添加前端URL
4. 保存设置

## 🏗️ 第三步：部署后端API到Vercel

### 3.1 准备项目文件

1. 确保项目结构正确：
   ```
   backend/
   ├── package.json
   ├── tsconfig.json
   ├── vercel.json
   ├── src/
   │   ├── server.ts
   │   ├── config/
   │   ├── controllers/
   │   ├── routes/
   │   ├── services/
   │   └── ...
   ```

### 3.2 推送代码到GitHub

```bash
# 初始化Git仓库 (如果还没有)
cd backend
git init
git add .
git commit -m "Initial commit for deployment"

# 创建GitHub仓库并推送
git remote add origin https://github.com/YOUR_USERNAME/real-estate-evaluation-backend.git
git branch -M main
git push -u origin main
```

### 3.3 在Vercel中部署后端

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入GitHub仓库：
   - 选择您的GitHub仓库
   - 点击 "Import"
4. 配置项目：
   - **Framework Preset**: "Other"
   - **Root Directory**: `backend/`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/`
5. 添加环境变量：
   - 点击 "Environment Variables"
   - 添加以下变量：
     ```
     NODE_ENV=production
     SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
     SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     JWT_SECRET=your-jwt-secret-key
     LOG_LEVEL=info
     ```
6. 点击 "Deploy"
7. 等待部署完成 (约1-2分钟)
8. 记录部署URL：`https://your-backend-url.vercel.app`

## 🎨 第四步：部署前端到Vercel

### 4.1 准备前端项目

```bash
cd frontend

# 安装依赖
npm install

# 构建项目
npm run build
```

### 4.2 配置前端环境变量

在前端项目中创建 `.env.production` 文件：

```bash
VITE_API_URL=https://your-backend-url.vercel.app
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 部署到Vercel

1. 在Vercel中，点击 "Add New Project"
2. 选择前端GitHub仓库
3. 配置项目：
   - **Framework Preset**: "Vite" 或 "React"
   - **Root Directory**: `frontend/`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/`
4. 添加环境变量 (同4.2)
5. 点击 "Deploy"
6. 等待部署完成

## 🧪 第五步：测试部署

### 5.1 测试后端API

```bash
# 测试健康检查端点
curl https://your-backend-url.vercel.app/health

# 测试API文档访问
# 浏览器访问: https://your-backend-url.vercel.app/api-docs
```

### 5.2 测试前端应用

1. 打开浏览器访问前端URL
2. 测试主要功能：
   - ✅ 用户注册/登录
   - ✅ 创建新项目
   - ✅ 上传Excel文件
   - ✅ 查看测算结果

### 5.3 检查Supabase数据

1. 在Supabase控制台中，查看：
   - **Table Editor**: 检查数据是否正常写入
   - **Authentication**: 检查用户是否正常注册
   - **Storage**: 检查文件是否正常上传

## ⚙️ 第六步：配置域名 (可选)

### 6.1 在Vercel中配置自定义域名

1. 在项目设置中，点击 "Domains"
2. 添加您的自定义域名：
   - 前端：`evaluation.yourdomain.com`
   - 后端：`api.yourdomain.com`
3. 按照Vercel的指引配置DNS记录

### 6.2 更新Supabase配置

1. 在Supabase控制台的Authentication设置中：
2. 更新 "Site URL" 为新的自定义域名

## 🔍 第七步：监控和维护

### 7.1 设置日志和监控

**Supabase监控**:
- 在Supabase控制台中查看：
  - "Logs" - 查看数据库和认证日志
  - "Database" - 查看数据库使用情况

**Vercel监控**:
- 在Vercel控制台中查看：
  - "Analytics" - 访问统计
  - "Logs" - 应用日志
  - "Deployments" - 部署历史

### 7.2 数据库备份

Supabase自动备份：
- 免费版：每天自动备份
- 保留期：7天

手动备份：
1. 在Supabase控制台，"Database" → "Backups"
2. 点击 "Create backup"
3. 等待备份完成

## 📊 部署资源限制

### Supabase免费版限制
- **数据库**: 500MB
- **文件存储**: 1GB
- **带宽**: 1GB/月
- **并发连接**: 60
- **API请求**: 50,000/月

### Vercel免费版限制
- **带宽**: 100GB/月
- **构建时长**: 6,000分钟/月
- **Serverless函数**: 100秒超时
- **并发请求**: 12

### 何时升级到付费版？

**流量增长信号**:
- ⚠️ 超过50%的使用限制
- ⚠️ 频繁的速率限制错误
- ⚠️ 用户增长超过100人

**升级建议**:
- Supabase Pro版: $25/月 (8GB数据库)
- Vercel Pro版: $20/月 (1TB带宽)

## 🚨 故障排除

### 常见问题

**Q: 部署后API返回404错误**
- 检查 `vercel.json` 中的路由配置
- 确认 `server.ts` 正确导出了Express app

**Q: Supabase连接失败**
- 验证环境变量 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- 检查Supabase项目状态

**Q: 文件上传失败**
- 确认Supabase Storage存储桶已创建
- 检查存储桶的权限设置

**Q: 前端无法连接后端**
- 检查CORS配置
- 验证 `VITE_API_URL` 环境变量

### 获取帮助

- **Vercel文档**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase文档**: [supabase.com/docs](https://supabase.com/docs)
- **GitHub Issues**: 在项目仓库提issue

## 📝 维护清单

### 每周检查
- [ ] 查看应用日志中的错误
- [ ] 检查数据库使用量
- [ ] 监控API响应时间

### 每月检查
- [ ] 审查安全日志
- [ ] 更新依赖包
- [ ] 备份数据库

### 每季度检查
- [ ] 性能优化评估
- [ ] 成本效益分析
- [ ] 功能升级规划

## 🎉 部署完成

恭喜！您的房地产成本收益测算系统已成功部署。

### 快速访问
- 🌐 **前端应用**: https://your-app.vercel.app
- 🔌 **后端API**: https://your-api.vercel.app
- 📚 **API文档**: https://your-api.vercel.app/api-docs
- 🗄️ **数据库**: Supabase控制台
- 📊 **监控**: Vercel和Supabase仪表板

### 下一步
1. 🔐 设置生产环境的安全配置
2. 👥 邀请用户开始使用系统
3. 📈 收集用户反馈，持续改进
4. 🚀 根据业务需求扩展功能

---

**部署状态**: ✅ 完成并运行中
**支持**: 如有问题，请查看故障排除章节或联系技术支持

祝您使用愉快！🎊