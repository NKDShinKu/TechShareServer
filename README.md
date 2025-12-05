# TechShareServer - 技术笔记分享平台后端

基于 NestJS + TypeORM + MySQL 的技术笔记分享平台后端服务。

## 技术栈

- **框架**: NestJS 11.x
- **数据库**: MySQL 8.0 + TypeORM
- **认证**: JWT (Access Token + Refresh Token)
- **文档**: Swagger/OpenAPI
- **验证**: class-validator + class-transformer
- **文件上传**: Multer

## 主要功能

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

## 项目结构

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

## 数据库设计

共 21 张表，主要包括：

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

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

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
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

### 3. 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE techshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 启动开发服务器

```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 5. 访问 API 文档

启动后访问: http://localhost:3000/api/docs

## API 端点概览

### 认证 `/api/auth`
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `POST /refresh` - 刷新 Token
- `GET /validate` - 验证 Token
- `POST /logout` - 登出

### 用户 `/api/users`
- `GET /:id` - 获取用户信息
- `GET /me/info` - 获取当前用户信息
- `PUT /me/profile` - 更新个人资料
- `POST /me/change-password` - 修改密码
- `POST /me/avatar` - 上传头像
- `GET /me/settings` - 获取用户设置
- `PUT /me/settings` - 更新用户设置
- `GET /:id/articles` - 获取用户文章列表
- `GET /me/favorites` - 获取收藏列表
- `GET /me/likes` - 获取点赞列表
- `GET /me/history` - 获取浏览历史

### 分类 `/api/categories`
- `GET /` - 获取所有分类
- `GET /:id` - 获取单个分类
- `POST /` - 创建分类（管理员）
- `PUT /:id` - 更新分类（管理员）
- `DELETE /:id` - 删除分类（管理员）

### 标签 `/api/tags`
- `GET /` - 获取所有标签
- `GET /popular` - 获取热门标签
- `GET /:id` - 获取单个标签
- `GET /slug/:slug` - 根据 slug 获取标签
- `POST /` - 创建标签（管理员）
- `PUT /:id` - 更新标签（管理员）
- `DELETE /:id` - 删除标签（管理员）

### 笔记 `/api/notes`
- `GET /` - 获取笔记列表（支持分类、标签、搜索、排序）
- `GET /:id` - 获取笔记详情
- `POST /` - 创建笔记（草稿）
- `PUT /:id` - 更新笔记（草稿）
- `POST /publish` - 发布笔记（提交审核）
- `DELETE /:id` - 删除笔记
- `GET /user/my-notes` - 获取我的笔记
- `GET /:id/versions` - 获取笔记版本列表
- `POST /:id/rollback/:versionId` - 回滚到指定版本

**笔记文件夹管理**:
- `POST /categories` - 创建文件夹
- `GET /categories/my` - 获取我的文件夹
- `PUT /categories/:id` - 更新文件夹
- `DELETE /categories/:id` - 删除文件夹

**管理员**:
- `GET /admin/pending` - 获取待审核笔记
- `POST /admin/audit/:versionId` - 审核笔记

### 评论与互动 `/api/comments`
- `POST /` - 发表评论
- `GET /note/:noteId` - 获取笔记的评论列表
- `DELETE /:id` - 删除评论
- `POST /:id/like` - 点赞/取消点赞评论
- `POST /notes/:noteId/like` - 点赞/取消点赞笔记
- `POST /notes/:noteId/favorite` - 收藏/取消收藏笔记
- `GET /notes/:noteId/interaction` - 检查用户互动状态

### 通知 `/api/notifications`
- `GET /` - 获取通知列表
- `GET /unread-count` - 获取未读数量
- `POST /:id/read` - 标记为已读
- `POST /batch-read` - 批量标记为已读
- `DELETE /:id` - 删除通知

### 文件上传 `/api/upload`
- `POST /avatar` - 上传头像
- `POST /cover` - 上传封面图
- `POST /attachment` - 上传附件

## 核心业务逻辑

### 笔记版本管理流程

1. **创建笔记**: 创建 Note 主记录和草稿版本（draft_version）
2. **编辑笔记**: 更新草稿版本内容
3. **提交发布**: 从草稿复制创建待审核版本（audit_status = 'pending'）
4. **管理员审核**: 
   - 通过：将 Note.published_version_id 指向该版本
   - 拒绝：记录拒绝原因
5. **更新发布**: 修改草稿后再次提交，重复步骤 3-4
6. **版本回滚**: 将 published_version_id 指向历史已审核版本

### 权限控制

- **@Public()**: 公开接口，无需登录
- **@ApiBearerAuth()**: 需要 JWT 认证
- **@Roles(UserRole.ADMIN)**: 仅管理员可访问

### 全局配置

- **全局前缀**: `/api`
- **全局验证管道**: 自动验证 DTO
- **全局异常过滤器**: 统一错误响应格式
- **全局响应拦截器**: 统一成功响应格式
- **全局 JWT 守卫**: 默认需要认证（除非使用 @Public()）

## 开发命令

```bash
# 开发
npm run start:dev

# 构建
npm run build

# 生产环境运行
npm run start:prod

# 格式化代码
npm run format

# Lint 检查
npm run lint

# 单元测试
npm run test

# E2E 测试
npm run test:e2e
```

## 注意事项

1. **首次启动**: TypeORM 的 `synchronize` 在开发环境为 `true`，会自动创建表结构
2. **生产环境**: 请将 `synchronize` 设为 `false` 并使用 migration
3. **文件上传**: 上传的文件保存在 `./uploads` 目录，需要配置静态文件服务
4. **环境变量**: 生产环境务必更改 JWT 密钥和数据库密码
5. **CORS**: 根据前端地址配置 CORS_ORIGIN

## 待实现功能

- [ ] 笔记导出为 PDF（需要额外的 PDF 生成库）
- [ ] WebSocket 实时通知
- [ ] Redis 缓存优化
- [ ] 搜索引擎集成（Elasticsearch）
- [ ] 图片压缩与 CDN 集成
- [ ] 敏感词过滤
- [ ] 用户关注功能
- [ ] 笔记分享功能

## 项目信息

- **项目名称**: TechShareServer
- **版本**: 1.0.0
- **作者**: TechShareHub Team
- **License**: UNLICENSED
