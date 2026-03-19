# 🚀 快速部署指南

## ⏱️ 预计部署时间：35分钟

## 📋 第一步：Supabase设置 (15分钟)

### 1.1 创建Supabase账户和项目

1. **访问Supabase**
   - 打开浏览器访问：https://supabase.com
   - 点击 "Start your project"
   - 使用邮箱或GitHub账户注册

2. **创建新项目**
   - 点击 "New Project"
   - 填写项目信息：
     - Project Name: `real-estate-evaluation`
     - Database Password: 创建强密码 (保存好！)
     - Region: 选择离您最近的区域
   - 等待项目创建完成 (约1-2分钟)

3. **获取项目凭据**
   - 点击左侧菜单 "Settings" → "API"
   - 复制以下信息并保存到记事本：
     ```
     Project URL: https://xxxxxxxxxxxxx.supabase.co
     anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

### 1.2 执行数据库初始化脚本

1. **打开SQL编辑器**
   - 在Supabase控制台，点击 "SQL Editor"
   - 点击 "New query"

2. **执行初始化脚本**
   - 打开项目中的 `backend/supabase-init.sql` 文件
   - 复制全部内容
   - 粘贴到SQL编辑器
   - 点击 "Run" 执行
   - 等待执行完成 (约30秒)

3. **验证表创建**
   - 点击左侧菜单 "Table Editor"
   - 应该看到16个表：
     - ✅ users
     - ✅ projects
     - ✅ versions
     - ✅ sales_data
     - ✅ construction_data
     - ✅ units_data
     - ✅ tenants_data
     - ✅ plan_data
     - ✅ calculation_parameters
     - ✅ calculation_results
     - ✅ file_uploads
     - 等等...

### 1.3 创建Storage存储桶

1. **创建存储桶**
   - 点击左侧菜单 "Storage"
   - 点击 "New bucket"
   - 填写信息：
     - Name: `project-files`
     - Public bucket: ❌ 取消勾选 (私有存储)
     - File size limit: `10485760` (10MB)
   - 点击 "Create bucket"

2. **配置存储桶权限**
   - 点击刚创建的 `project-files` 桶
   - 进入 "Policies" 标签页
   - 点击 "New policy"
   - 选择 "Get started quickly"
   - 选择 "Storage read/write access to authenticated users"
   - 使用默认配置
   - 点击 "Review" → "Save policy"

### 1.4 配置认证设置

1. **验证Email认证**
   - 点击左侧菜单 "Authentication"
   - 在 "Providers" 标签页确认 "Email" 已启用 ✅

2. **配置URL设置**
   - 点击 "URL Configuration" 标签页
   - Site URL: 暂时留空，部署后端时填写
   - Redirect URLs: 暂时留空，部署前端时填写
   - 点击 "Save"

---

## 🏗️ 第二步：部署后端到Vercel (10分钟)

### 2.1 准备后端代码

```bash
# 进入后端目录
cd backend

# 安装Supabase依赖
npm install @supabase/supabase-js

# 构建项目
npm run build

# 初始化Git仓库 (如果还没有)
git init
git add .
git commit -m "Ready for Supabase deployment"

# 推送到GitHub
git remote add origin https://github.com/YOUR_USERNAME/real-estate-evaluation-backend.git
git branch -M main
git push -u origin main
```

### 2.2 在Vercel中部署

1. **登录Vercel**
   - 访问：https://vercel.com
   - 使用GitHub账户登录

2. **导入项目**
   - 点击 "Add New Project"
   - 在 "Import Git Repository" 中选择 `real-estate-evaluation-backend`
   - 点击 "Import"

3. **配置项目设置**
   - **Framework Preset**: 选择 "Other"
   - **Root Directory**: 输入 `backend/`
   - **Build Command**: 输入 `npm run build`
   - **Output Directory**: 输入 `dist/`
   - 点击 "Continue"

4. **添加环境变量**
   在 "Environment Variables" 中添加以下变量：

   ```
   NODE_ENV=production
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co (从Supabase获取)
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (从Supabase获取)
   JWT_SECRET=your-secure-jwt-secret-key-change-this-in-production
   LOG_LEVEL=info
   ```

   ⚠️ **重要**: 将上面的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 替换为您从第一步获取的实际值

5. **开始部署**
   - 点击 "Deploy"
   - 等待部署完成 (约1-2分钟)
   - 记录部署URL：`https://your-backend-xxxxx.vercel.app`

### 2.3 更新Supabase配置

回到Supabase控制台：
1. 点击 "Authentication" → "URL Configuration"
2. Site URL: 输入您的后端URL：`https://your-backend-xxxxx.vercel.app`
3. Redirect URLs: 添加相同的URL
4. 点击 "Save"

---

## 🎨 第三步：部署前端到Vercel (10分钟)

### 3.1 准备前端代码

```bash
# 进入前端目录
cd frontend

# 创建生产环境变量文件
cat > .env.production << EOL
VITE_API_URL=https://your-backend-xxxxx.vercel.app (使用实际后端URL)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co (使用实际Supabase URL)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (使用实际密钥)
EOL

# 构建项目
npm run build

# 初始化Git仓库 (如果还没有)
git init
git add .
git commit -m "Ready for production deployment"

# 推送到GitHub
git remote add origin https://github.com/YOUR_USERNAME/real-estate-evaluation-frontend.git
git branch -M main
git push -u origin main
```

### 3.2 在Vercel中部署

1. **导入前端项目**
   - 在Vercel中点击 "Add New Project"
   - 选择 `real-estate-evaluation-frontend` 仓库
   - 点击 "Import"

2. **配置项目设置**
   - **Framework Preset**: 选择 "Vite" 或 "React"
   - **Root Directory**: 输入 `frontend/`
   - **Build Command**: 输入 `npm run build`
   - **Output Directory**: 输入 `dist/`
   - 点击 "Continue"

3. **添加环境变量**
   在 "Environment Variables" 中添加：

   ```
   VITE_API_URL=https://your-backend-xxxxx.vercel.app
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **开始部署**
   - 点击 "Deploy"
   - 等待部署完成 (约1-2分钟)
   - 记录部署URL：`https://your-app-xxxxx.vercel.app`

### 3.3 最终配置

1. **更新Supabase认证URL**
   - 回到Supabase "Authentication" → "URL Configuration"
   - Site URL: 更新为前端URL：`https://your-app-xxxxx.vercel.app`
   - Redirect URLs: 添加前端URL
   - 点击 "Save"

---

## 🧪 第四步：测试和验证 (5分钟)

### 4.1 测试后端API

```bash
# 测试健康检查
curl https://your-backend-xxxxx.vercel.app/health

# 应该返回类似：
# {"status":"ok","database":{"status":"healthy"},"cache":{...}}
```

### 4.2 测试前端应用

1. **打开浏览器**
   - 访问：`https://your-app-xxxxx.vercel.app`
   - 应该看到登录页面

2. **测试完整流程**
   - ✅ 注册新用户
   - ✅ 登录系统
   - ✅ 创建新项目
   - ✅ 上传Excel文件
   - ✅ 查看测算结果

### 4.3 检查Supabase数据

1. **查看数据库**
   - 在Supabase控制台，点击 "Table Editor"
   - 查看 `users` 表，应该看到注册的用户
   - 查看 `projects` 表，应该看到创建的项目
   - 查看 `file_uploads` 表，应该看到上传的文件

2. **查看存储**
   - 点击 "Storage" → `project-files`
   - 应该看到上传的Excel文件

---

## 🎯 部署完成检查清单

- [ ] Supabase项目创建完成
- [ ] 所有数据库表创建成功
- [ ] Storage存储桶配置完成
- [ ] 认证设置正确配置
- [ ] 后端部署到Vercel成功
- [ ] 后端API端点可访问
- [ ] 前端部署到Vercel成功
- [ ] 前端应用正常运行
- [ ] 用户注册登录正常
- [ ] 核心功能测试通过

---

## 🔗 重要链接和资源

### 访问地址
- **前端应用**: `https://your-app-xxxxx.vercel.app`
- **后端API**: `https://your-backend-xxxxx.vercel.app`
- **API文档**: `https://your-backend-xxxxx.vercel.app/api-docs`
- **Supabase控制台**: https://app.supabase.com
- **Vercel控制台**: https://vercel.com/dashboard

### 技术文档
- **完整部署指南**: `DEPLOYMENT_GUIDE.md`
- **部署检查清单**: `DEPLOYMENT_CHECKLIST.md`
- **Supabase文档**: https://supabase.com/docs
- **Vercel文档**: https://vercel.com/docs

### 调试工具
- **API测试**: Postman 或 Insomnia
- **数据库管理**: Supabase SQL Editor
- **日志查看**: Vercel Logs 和 Supabase Logs

---

## 🆘️ 常见问题快速解决

### 问题1: 后端部署失败
- **检查**: `vercel.json` 文件存在且配置正确
- **检查**: `package.json` 中的 build 命令正确
- **检查**: Node.js 版本兼容性

### 问题2: Supabase连接失败
- **检查**: 环境变量 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 正确
- **检查**: Supabase项目状态为 "Active"
- **检查**: 网络连接和防火墙设置

### 问题3: 文件上传失败
- **检查**: Storage存储桶已创建
- **检查**: 存储桶权限策略正确
- **检查**: 文件大小未超过限制 (10MB)

### 问题4: 前端无法连接后端
- **检查**: `VITE_API_URL` 环境变量正确
- **检查**: 后端CORS配置
- **检查**: 后端URL可访问

---

## 🎉 部署成功！

恭喜！您的房地产成本收益测算系统已成功部署到生产环境。

**下一步**:
1. ✨ 开始使用系统
2. 👥 邀请团队成员注册
3. 📈 监控系统性能
4. 🔔 设置告警通知

**支持**: 如有问题，查看 `DEPLOYMENT_GUIDE.md` 或 `DEPLOYMENT_CHECKLIST.md` 获取详细帮助。

祝您使用愉快！🚀