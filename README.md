# TechShareServer - 技术笔记分享平台后端

基于 NestJS + TypeORM + MySQL 的技术笔记分享平台后端服务。

## 技术栈

- **框架**: NestJS 11.x
- **数据库**: MySQL 8.0 + TypeORM
- **认证**: JWT (Access Token + Refresh Token)
- **文档**: Swagger/OpenAPI
- **验证**: class-validator + class-transformer
- **文件上传**: Multer

## 数据库初始化
`CREATE DATABASE techshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

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

### 详细表结构

#### 1. 用户表 (users)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 用户ID |
| username | VARCHAR | 32 | 唯一 | 否 | 登录名 |
| email | VARCHAR | 128 | 唯一 | 是 | 邮箱 |
| password_hash | VARCHAR | 255 | - | 否 | 加盐哈希 |
| nickname | VARCHAR | 64 | - | 是 | 昵称 |
| avatar_url | VARCHAR | 255 | - | 是 | 头像URL |
| bio | VARCHAR | 256 | - | 是 | 个人签名 |
| role | ENUM | - | - | 否 | 角色（USER/ADMIN） |
| status | TINYINT UNSIGNED | - | - | 否 | 状态（0正常/1封禁） |
| github | VARCHAR | 128 | - | 是 | GitHub主页 |
| phone | VARCHAR | 32 | - | 是 | 手机号 |
| last_login_at | DATETIME | - | - | 是 | 最近登录时间 |
| created_at | DATETIME | - | - | 否 | 创建时间 |
| updated_at | DATETIME | - | - | 否 | 更新时间 |

**索引**: UNIQUE(username), UNIQUE(email), INDEX(role), INDEX(status)

**索引**: UNIQUE(username), UNIQUE(email), INDEX(role), INDEX(status)

---

#### 2. 用户设置 (user_settings)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 关联users.id |
| theme | ENUM | - | - | 否 | 站点主题（light/dark/system） |
| editor_theme | ENUM | - | - | 否 | 编辑器主题（green/blue/purple/pink/orange/default） |
| editor_prefs | JSON | - | - | 是 | 编辑器偏好（字号/行高/工具栏） |
| created_at | DATETIME | - | - | 否 | 创建时间 |
| updated_at | DATETIME | - | - | 否 | 更新时间 |

**索引**: UNIQUE(user_id)

---

#### 3. 刷新令牌 (auth_refresh_tokens)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 关联users.id |
| token | VARCHAR | 255 | 唯一 | 否 | 刷新令牌（建议存哈希） |
| expires_at | DATETIME | - | - | 否 | 过期时间 |
| revoked | TINYINT | 1 | - | 否 | 是否已撤销 |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**索引**: INDEX(user_id), UNIQUE(token)

---

#### 4. 全站分类 (categories)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 分类ID |
| name | VARCHAR | 64 | 唯一 | 否 | 分类名称 |
| slug | VARCHAR | 64 | 唯一 | 否 | URL别名 |
| parent_id | BIGINT UNSIGNED | - | 外键 | 是 | 父分类ID（自关联） |
| is_public | TINYINT | 1 | - | 否 | 是否公开 |
| created_at | DATETIME | - | - | 否 | 创建时间 |
| updated_at | DATETIME | - | - | 否 | 更新时间 |

**索引**: UNIQUE(name), UNIQUE(slug), INDEX(parent_id)

---

#### 5. 标签 (tags)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 标签ID |
| name | VARCHAR | 64 | 唯一 | 否 | 标签名称 |
| slug | VARCHAR | 64 | 唯一 | 否 | URL别名 |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**索引**: UNIQUE(name), UNIQUE(slug)

---

#### 6. 笔记主表 (notes)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 笔记ID |
| author_id | BIGINT UNSIGNED | - | 外键 | 否 | 作者ID（users.id） |
| draft_version_id | BIGINT UNSIGNED | - | 外键 | 是 | 草稿版本ID |
| pending_version_id | BIGINT UNSIGNED | - | 外键 | 是 | 待审核版本ID |
| published_version_id | BIGINT UNSIGNED | - | 外键 | 是 | 已发布版本ID |
| allow_export | TINYINT | 1 | - | 否 | 是否允许导出 |
| status | ENUM | - | - | 否 | 状态（draft/pending/rejected/published/private） |
| audit_reason | VARCHAR | 255 | - | 是 | 审核拒绝原因 |
| auditor_id | BIGINT UNSIGNED | - | 外键 | 是 | 审核人ID |
| likes_count | INT UNSIGNED | - | - | 否 | 点赞数 |
| favorites_count | INT UNSIGNED | - | - | 否 | 收藏数 |
| comments_count | INT UNSIGNED | - | - | 否 | 评论数 |
| views | INT UNSIGNED | - | - | 否 | 浏览量 |
| published_at | DATETIME | - | - | 是 | 发布时间 |
| deleted_at | DATETIME | - | - | 是 | 软删除时间 |
| created_at | DATETIME | - | - | 否 | 创建时间 |
| updated_at | DATETIME | - | - | 否 | 更新时间 |

**索引**: INDEX(author_id), INDEX(status), INDEX(published_at)

---

#### 7. 笔记版本表 (note_versions)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 版本ID |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| title | VARCHAR | 200 | - | 否 | 标题 |
| content_md | MEDIUMTEXT | - | - | 否 | Markdown内容 |
| content_html | MEDIUMTEXT | - | - | 是 | HTML预渲染缓存 |
| excerpt | VARCHAR | 500 | - | 是 | 摘要 |
| cover_url | VARCHAR | 255 | - | 是 | 封面URL |
| category_id | BIGINT UNSIGNED | - | 外键 | 是 | 分类ID（categories.id） |
| allow_export | TINYINT | 1 | - | 否 | 版本级导出权限 |
| version_type | ENUM | - | - | 否 | 版本类型（draft/pending/published） |
| created_by | BIGINT UNSIGNED | - | 外键 | 否 | 版本创建者ID |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**索引**: INDEX(note_id), INDEX(category_id), INDEX(version_type)

---

#### 8. 版本标签关联 (note_version_tags)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| version_id | BIGINT UNSIGNED | - | 复合主键 | 否 | 版本ID（note_versions.id） |
| tag_id | BIGINT UNSIGNED | - | 复合主键 | 否 | 标签ID（tags.id） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**约束**: PRIMARY KEY(version_id, tag_id), INDEX(tag_id)

---

#### 9. 笔记附件 (note_attachments)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 附件ID |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| url | VARCHAR | 255 | - | 否 | 附件URL |
| filename | VARCHAR | 128 | - | 是 | 原始文件名 |
| mime_type | VARCHAR | 64 | - | 是 | MIME类型 |
| size_bytes | BIGINT UNSIGNED | - | - | 是 | 文件大小（字节） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**索引**: INDEX(note_id)

---

#### 10. 个人文件夹 (user_categories)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 文件夹ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 用户ID（users.id） |
| name | VARCHAR | 64 | - | 否 | 文件夹名称 |
| slug | VARCHAR | 64 | - | 是 | URL别名 |
| parent_id | BIGINT UNSIGNED | - | 外键 | 是 | 父文件夹ID（自关联） |
| created_at | DATETIME | - | - | 否 | 创建时间 |
| updated_at | DATETIME | - | - | 否 | 更新时间 |

**索引**: UNIQUE(user_id, name), INDEX(parent_id)

---

#### 11. 笔记-文件夹关联 (note_user_categories)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| note_id | BIGINT UNSIGNED | - | 复合主键 | 否 | 笔记ID（notes.id） |
| user_category_id | BIGINT UNSIGNED | - | 复合主键 | 否 | 文件夹ID（user_categories.id） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**约束**: PRIMARY KEY(note_id, user_category_id), INDEX(user_category_id)

---

#### 12. 评论 (comments)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 评论ID |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| author_id | BIGINT UNSIGNED | - | 外键 | 否 | 评论者ID（users.id） |
| parent_id | BIGINT UNSIGNED | - | 外键 | 是 | 父评论ID |
| root_id | BIGINT UNSIGNED | - | 外键 | 是 | 根评论ID（一级评论） |
| content | TEXT | - | - | 否 | 评论内容 |
| likes_count | INT UNSIGNED | - | - | 否 | 点赞数 |
| is_deleted | TINYINT | 1 | - | 否 | 是否已删除（软删除） |
| created_at | DATETIME | - | - | 否 | 创建时间 |
| updated_at | DATETIME | - | - | 否 | 更新时间 |

**索引**: INDEX(note_id), INDEX(author_id), INDEX(root_id), INDEX(parent_id)

---

#### 13. 评论点赞 (comment_likes)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 用户ID（users.id） |
| comment_id | BIGINT UNSIGNED | - | 外键 | 否 | 评论ID（comments.id） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**约束**: UNIQUE(user_id, comment_id), INDEX(comment_id)

---

#### 14. 评论@提及 (comment_mentions)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| comment_id | BIGINT UNSIGNED | - | 外键 | 否 | 评论ID（comments.id） |
| mentioned_user_id | BIGINT UNSIGNED | - | 外键 | 否 | 被提及用户ID（users.id） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**索引**: INDEX(comment_id), INDEX(mentioned_user_id)

---

#### 15. 笔记点赞 (note_likes)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 用户ID（users.id） |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**约束**: UNIQUE(user_id, note_id), INDEX(note_id)

---

#### 16. 笔记收藏 (note_favorites)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 用户ID（users.id） |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**约束**: UNIQUE(user_id, note_id), INDEX(note_id)

---

#### 17. 通知 (notifications)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 通知ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 接收者ID（users.id） |
| type | ENUM | - | - | 否 | 类型（system/comment/reply/like/favorite/mention） |
| actor_user_id | BIGINT UNSIGNED | - | 外键 | 是 | 触发者ID（users.id） |
| note_id | BIGINT UNSIGNED | - | 外键 | 是 | 相关笔记ID |
| comment_id | BIGINT UNSIGNED | - | 外键 | 是 | 相关评论ID |
| title | VARCHAR | 128 | - | 是 | 通知标题 |
| content | VARCHAR | 512 | - | 是 | 通知内容 |
| is_read | TINYINT | 1 | - | 否 | 是否已读 |
| read_at | DATETIME | - | - | 是 | 阅读时间 |
| created_at | DATETIME | - | - | 否 | 创建时间 |

**索引**: INDEX(user_id, is_read), INDEX(type), INDEX(note_id), INDEX(comment_id)

---

#### 18. 浏览历史 (user_note_history)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 用户ID（users.id） |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| viewed_at | DATETIME | - | - | 否 | 浏览时间 |

**索引**: INDEX(user_id, viewed_at), INDEX(note_id)

---

#### 19. 按日统计 (note_stats_daily)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| stat_date | DATE | - | - | 否 | 统计日期 |
| views | INT UNSIGNED | - | - | 否 | 浏览量 |
| likes | INT UNSIGNED | - | - | 否 | 点赞数 |
| favorites | INT UNSIGNED | - | - | 否 | 收藏数 |
| comments | INT UNSIGNED | - | - | 否 | 评论数 |

**约束**: UNIQUE(note_id, stat_date), INDEX(stat_date)

---

#### 20. 导出日志 (note_export_logs)

| 字段名 | 类型 | 长度 | 约束 | 可空 | 说明 |
|--------|------|------|------|------|------|
| id | BIGINT UNSIGNED | - | 主键 | 否 | 主键ID |
| note_id | BIGINT UNSIGNED | - | 外键 | 否 | 笔记ID（notes.id） |
| user_id | BIGINT UNSIGNED | - | 外键 | 否 | 用户ID（users.id） |
| format | ENUM | - | - | 否 | 导出格式（md/pdf） |
| ip | VARCHAR | 45 | - | 是 | IP地址（支持IPv4/IPv6） |
| created_at | DATETIME | - | - | 否 | 导出时间 |

**索引**: INDEX(note_id), INDEX(user_id), INDEX(created_at)

---

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
