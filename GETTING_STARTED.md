# 🚀 快速开始指南

欢迎使用 TechShareHub 后端服务！本指南将帮助你在 5 分钟内启动项目。

## 📋 前置要求

- ✅ Node.js >= 18.x
- ✅ MySQL >= 8.0
- ✅ npm 或 yarn

## 🔧 安装步骤

### 1. 安装依赖

```bash
cd TechShareServer
npm install
```

### 2. 创建环境配置文件

在项目根目录创建 `.env` 文件（复制以下内容）：

```env
# 应用配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=techshare

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

⚠️ **重要**: 请修改 `DB_PASSWORD` 为你的 MySQL 密码！

### 3. 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 执行以下 SQL 命令
CREATE DATABASE techshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

### 4. 启动服务

```bash
npm run start:dev
```

看到以下输出表示启动成功：

```
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🚀 TechShareHub API Server is running!                 ║
    ║                                                           ║
    ║   📡 Server: http://localhost:3000                        ║
    ║   📚 Swagger: http://localhost:3000/api/docs             ║
    ║   🌍 Environment: development                             ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
```

### 5. 初始化数据（可选但推荐）

在新的终端窗口执行：

```bash
mysql -u root -p techshare < docs/init.sql
```

这将创建：
- ✅ 管理员账户（用户名: `admin`, 密码: `admin123`）
- ✅ 测试用户（用户名: `testuser`, 密码: `test123`）
- ✅ 10 个默认分类（前端、后端、移动端等）
- ✅ 30 个常用标签（JavaScript、Vue、React等）

## 🎯 验证安装

### 1. 访问 Swagger 文档

打开浏览器访问: http://localhost:3000/api/docs

你将看到完整的 API 文档界面。

### 2. 测试登录接口

在 Swagger 界面中：

1. 找到 `POST /api/auth/login` 接口
2. 点击 "Try it out"
3. 输入以下内容：

```json
{
  "username": "admin",
  "password": "admin123"
}
```

4. 点击 "Execute"

如果返回 token，说明一切正常！

### 3. 测试需要认证的接口

1. 复制上一步返回的 `token` 值
2. 点击页面右上角的 "Authorize" 按钮
3. 在弹出框中输入: `Bearer <你的token>`
4. 点击 "Authorize"

现在你可以测试所有需要认证的接口了！

## 📚 下一步

### 开发相关文档

- 📖 [完整 README](./README.md) - 项目详细介绍
- 🗃️ [数据库设计](./docs/DATABASE.md) - 数据库结构说明
- 🔌 [API 文档](./docs/API.md) - API 使用指南
- 🚀 [部署指南](./docs/DEPLOYMENT.md) - 生产环境部署
- 💾 [初始化数据](./docs/INITIAL_DATA.md) - 数据初始化说明

### 常用开发命令

```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式构建
npm run build

# 运行生产版本
npm run start:prod

# 代码格式化
npm run format

# Lint 检查
npm run lint
```

## 🔍 接口概览

### 核心功能

| 模块 | 端点 | 描述 |
|------|------|------|
| 认证 | `/api/auth/*` | 登录、注册、Token 刷新 |
| 用户 | `/api/users/*` | 用户信息、设置管理 |
| 分类 | `/api/categories/*` | 分类管理 |
| 标签 | `/api/tags/*` | 标签管理 |
| 笔记 | `/api/notes/*` | 笔记 CRUD、版本管理、审核 |
| 评论 | `/api/comments/*` | 评论、点赞、收藏 |
| 通知 | `/api/notifications/*` | 消息通知 |
| 上传 | `/api/upload/*` | 文件上传 |

详细的 API 文档请访问 Swagger UI。

## ❓ 常见问题

### Q: 数据库连接失败？

**A**: 检查以下几点：
1. MySQL 服务是否启动
2. `.env` 文件中的数据库密码是否正确
3. 数据库 `techshare` 是否已创建

### Q: TypeORM 同步表结构失败？

**A**: 
1. 确保 MySQL 版本 >= 8.0
2. 确认数据库字符集为 utf8mb4
3. 查看终端错误日志，通常会显示具体原因

### Q: JWT Token 验证失败？

**A**:
1. 确认 Token 格式: `Authorization: Bearer <token>`
2. 检查 Token 是否过期（默认 1 小时）
3. 使用 Refresh Token 刷新

### Q: 文件上传失败？

**A**:
1. 检查 `uploads` 目录是否存在且有写权限
2. 确认文件大小未超过限制
3. 检查文件类型是否符合要求

## 🤝 需要帮助？

如果遇到问题：

1. 📖 查看详细文档（`docs/` 目录）
2. 🔍 检查终端日志输出
3. 🧪 使用 Swagger UI 测试接口
4. 💬 联系开发团队

## 🎉 开始开发

现在你已经成功启动了后端服务！

**建议的开发流程**：

1. ✅ 使用 Swagger UI 熟悉所有 API 接口
2. ✅ 创建一些测试数据（笔记、评论等）
3. ✅ 启动前端项目并与后端联调
4. ✅ 根据需求扩展功能

祝你开发愉快！🚀

