# TechShare Server

TechShare Server 是 TechShare 技术分享平台的后端服务，基于 [NestJS](https://nestjs.com/) 框架构建。它提供了RESTful API，支持用户认证、内容管理、互动交流等核心功能。

## 🛠 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript
- **数据库**: MySQL 8.0+
- **ORM**: TypeORM
- **认证**: JWT (JSON Web Token) + Passport
- **文件上传**: Multer
- **API 文档**: Swagger

## ✨ 主要功能

### 1. 用户系统
- 用户注册、登录、登出
- JWT 认证与 Token 刷新
- 用户资料管理（头像、个人信息、设置）
- 密码修改
- 主题设置（浅色/深色、编辑器主题）

### 2. 笔记系统
- **版本管理**: 草稿版本 + 已发布版本分离
- **创作流程**: 创建草稿 → 编辑 → 提交发布 → 审核 → 发布
- **文件夹管理**: 个人分类文件夹组织笔记
- **版本回滚**: 支持回滚到历史已发布版本
- **导出权限**: 作者可设置是否允许他人导出
- Markdown 编辑与预览

### 3. 分类与标签
- 全站分类管理（支持层级）
- 标签系统（热门标签、标签筛选）
- 笔记发布时最多关联 2 个标签

### 4. 互动功能
- **点赞**: 笔记点赞、评论点赞
- **收藏**: 笔记收藏
- **评论**: 支持两级回复（评论 → 回复 → 回复）
- **@提及**: 评论中支持 @ 提及用户

### 5. 消息通知
- 系统通知
- 评论通知
- 点赞通知
- 收藏通知
- @ 提及通知
- 批量标记已读

### 6. 文件上传
- 头像上传（2MB 限制）
- 封面图上传（5MB 限制）
- 附件上传（10MB 限制）

### 7. 管理员功能
- 笔记审核（通过/拒绝）
- 用户管理（封禁/解封）
- 分类和标签管理
- 系统通知发布

### 8. 统计与历史
- 浏览历史记录
- 笔记统计数据（阅读量、点赞数、收藏数等）
- 创作者数据可视化（前端实现）

## 📂 项目结构

```
src/
├── common/                 # 通用模块
│   ├── decorators/        # 装饰器（@CurrentUser, @Public, @Roles）
│   ├── filters/           # 异常过滤器
│   ├── guards/            # 守卫（JWT、角色）
│   ├── interceptors/      # 拦截器（响应转换）
│   └── pipes/             # 管道（验证）
├── config/                # 配置文件
│   └── database.config.ts # 数据库配置
├── entities/              # 数据库实体（21个表）
│   ├── user.entity.ts
│   ├── note.entity.ts
│   ├── note-version.entity.ts
│   └── ...
├── modules/               # 功能模块
│   ├── auth/             # 认证模块
│   ├── users/            # 用户模块
│   ├── categories/       # 分类模块
│   ├── tags/             # 标签模块
│   ├── notes/            # 笔记模块
│   ├── comments/         # 评论与互动模块
│   ├── notifications/    # 通知模块
│   └── upload/           # 文件上传模块
├── app.module.ts         # 主模块
└── main.ts               # 入口文件
```


## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16
- MySQL >= 8.0

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件，并配置数据库连接信息：

```env
# 应用配置
PORT=3000
NODE_ENV=development

# 数据库配置
# 应用配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=xxx
DB_DATABASE=techshare

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=6h
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# TypeORM 控制（临时用于避免自动同步导致的冲突）
TYPEORM_SYNCHRONIZE=true
TYPEORM_LOGGING=true

# CORS 配置
CORS_ORIGIN=http://localhost:5173

# 文件上传配置
UPLOAD_DEST=./uploads
```

### 4. 运行项目

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run start:prod
```

### 5. 访问 API 文档

启动后访问: http://localhost:3000/api/docs

## 注意事项

1. **首次启动**: TypeORM 的 `synchronize` 在开发环境为 `true`，会自动创建表结构
2. **生产环境**: 请将 `synchronize` 设为 `false` 并使用 migration
3. **文件上传**: 上传的文件保存在 `./uploads` 目录，需要配置静态文件服务
4. **环境变量**: 生产环境务必更改 JWT 密钥和数据库密码
5. **CORS**: 根据前端地址配置 CORS_ORIGIN

## 数据库设计

共 20 张表，主要包括：

### 核心表
- **users**: 用户表
- **user_settings**: 用户设置
- **auth_refresh_tokens**: 刷新令牌
- **notes**: 笔记主表（聚合统计）
- **note_versions**: 笔记版本表（核心业务逻辑）
- **categories**: 全站分类
- **tags**: 标签
- **note_version_tags**: 笔记版本-标签关联

### 组织与管理
- **user_categories**: 个人文件夹
- **note_user_categories**: 笔记-文件夹关联

### 互动表
- **comments**: 评论
- **comment_likes**: 评论点赞
- **comment_mentions**: 评论@提及
- **note_likes**: 笔记点赞
- **note_favorites**: 笔记收藏

### 辅助表
- **notifications**: 通知
- **user_note_history**: 浏览历史
- **note_stats_daily**: 按日统计
- **note_export_logs**: 导出日志
- **note_attachments**: 附件

---

## 📚 文档

更多详细文档请参考 `docs/` 目录：
- [API 文档](docs/API.md)
- [数据库设计](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)

## 📄 License

[UNLICENSED](LICENSE)

## 🔌 关联项目

- 用户前台: [TechShare Hub](https://github.com/NKDShinKu/TechShareHub)
- 管理后台: [TechShare Admin](https://github.com/NKDShinKu/TechShareAdmin)