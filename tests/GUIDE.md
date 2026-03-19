# 测试运行指南

## 概述

本指南描述了如何运行和验证房地产成本收益测算系统的测试套件。

## 测试类型

### 1. 单元测试
测试单个函数和组件的独立性。

### 2. 集成测试
测试多个组件之间的交互，包括API端点和数据库交互。

## 前置要求

### 必需条件
- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm 或 yarn

### 可选条件
- 测试数据库（独立于开发数据库）

## 安装依赖

```bash
cd backend
npm install
```

## 环境配置

### 1. 创建 `.env` 文件

```bash
cp .env.example .env
```

### 2. 配置数据库连接

编辑 `.env` 文件：

```env
# 开发数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=real_estate_eval
DB_USER=postgres
DB_PASSWORD=your_password

# 测试数据库（可选，默认使用开发数据库）
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=real_estate_eval_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=your_test_password
```

### 3. 创建测试数据库（可选）

```bash
# 创建测试数据库
createdb real_estate_eval_test

# 运行迁移脚本
psql -d real_estate_eval_test -f database/migrations/001_create_users.sql
# ... 依次运行所有迁移脚本
```

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
# 运行用户测试
npm test -- users.test.ts

# 运行计算测试
npm test -- calculations.test.ts

# 运行项目测试
npm test -- projects.test.ts
```

### 运行集成测试

```bash
npm run test:integration
```

### 生成测试覆盖率报告

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录中。

### 监视模式

```bash
npm run test:watch
```

## 测试结构

```
backend/src/tests/
├── setup.ts                    # 测试环境设置
├── helpers/                    # 测试辅助函数
├── integration/                # 集成测试
│   ├── users.test.ts          # 用户API测试
│   ├── projects.test.ts       # 项目API测试
│   ├── calculations.test.ts   # 计算API测试
│   └── health.test.ts         # 健康检查测试
└── README.md                   # 测试文档
```

## 测试数据管理

### 数据清理
- 每个测试前自动清理以 `test-` 开头的用户和关联数据
- 测试数据使用事务隔离，不会影响开发数据

### 测试用户创建
```javascript
const testUser = {
  username: 'test-user-' + Date.now(),
  email: 'test-' + Date.now() + '@example.com',
  password: 'test123'
};
```

## 常见问题

### 问题1: 数据库连接失败
```
Error: connect ECONNREFUSED
```

**解决方案:**
- 检查PostgreSQL服务是否运行
- 验证 `.env` 文件中的数据库配置
- 确保数据库存在

### 问题2: 测试超时
```
Error: Timeout - Async callback was not invoked
```

**解决方案:**
- 增加测试超时时间: `jest.setTimeout(30000);`
- 检查数据库查询性能
- 验证网络连接

### 问题3: 表不存在错误
```
Error: relation "table_name" does not exist
```

**解决方案:**
- 运行数据库迁移脚本
- 检查表名拼写
- 验证数据库schema

## CI/CD集成

### GitHub Actions示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: real_estate_eval_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## 性能基准

### 预期测试执行时间
- 单元测试: < 5秒
- 集成测试: < 30秒
- 完整测试套件: < 1分钟

### 覆盖率目标
- 总体覆盖率: >= 80%
- 关键业务逻辑: >= 90%
- API路由: >= 85%

## 最佳实践

1. **测试隔离**: 每个测试应该独立运行
2. **清理数据**: 测试后清理创建的数据
3. **使用工厂函数**: 创建测试数据的工厂函数
4. **模拟外部服务**: 不依赖真实的外部API
5. **描述性命名**: 测试名称应该清楚描述测试内容

## 调试技巧

### 运行单个测试
```bash
npm test -- -t "should create new user"
```

### 显示详细输出
```bash
npm test -- --verbose
```

### 调试模式
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 下一步

- 添加端到端测试
- 性能测试
- 负载测试
- 安全测试

## 支持

如有问题，请查看：
- 项目README.md
- Jest文档: https://jestjs.io/
- PG文档: https://node-postgres.com/
