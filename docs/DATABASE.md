# 数据库设计文档

## 数据库概览

- **数据库类型**: MySQL 8.0
- **字符集**: utf8mb4
- **时区**: UTC
- **表数量**: 20 张

## 核心设计理念

### 1. 笔记版本管理

笔记采用双版本指针设计：
- `draft_version_id`: 指向当前草稿版本（编辑中）
- `published_version_id`: 指向已发布版本（线上展示）

**优势**:
- 草稿与发布内容完全分离
- 支持同时编辑草稿和展示已发布内容
- 完整的版本历史记录
- 灵活的版本回滚机制

### 2. 审核流程

```
创建笔记（草稿）
    ↓
编辑草稿版本
    ↓
提交发布（创建待审核版本）
    ↓
管理员审核
    ├─→ 通过：更新 published_version_id
    └─→ 拒绝：记录原因，草稿可继续修改
```

### 3. 软删除

`notes` 表使用 `deleted_at` 字段实现软删除，保留数据用于审计。

### 4. 计数冗余

为提高查询性能，在主表冗余计数字段：
- `notes.likes_count`: 点赞数
- `notes.favorites_count`: 收藏数
- `notes.comments_count`: 评论数
- `notes.views`: 浏览量
- `comments.likes_count`: 评论点赞数

## 表结构详细说明

### 用户相关

#### users - 用户表
- 核心字段：username（唯一）、email（唯一）、password_hash
- 角色：USER、ADMIN
- 状态：0 正常、1 封禁

#### user_settings - 用户设置
- 主题设置：light/dark/system
- 编辑器主题：green/blue/purple/pink/orange/default
- 编辑器偏好（JSON）

#### auth_refresh_tokens - 刷新令牌
- 存储 refresh token
- 支持撤销（revoked 字段）

### 笔记相关

#### notes - 笔记主表
- 聚合统计信息
- 双版本指针（draft_version_id, published_version_id）
- 状态：draft/published/private

#### note_versions - 笔记版本表
- 完整的版本快照
- 审核状态：draft/pending/approved/rejected
- 关联分类和标签

#### note_version_tags - 版本标签关联
- 每个版本可关联多个标签（建议最多 2 个）

#### note_attachments - 笔记附件
- 文件 URL、类型、大小

### 分类与标签

#### categories - 全站分类
- 支持层级（parent_id）
- 公开/私有标识

#### tags - 标签
- 名称和 slug（URL 友好）

#### user_categories - 个人文件夹
- 用户自己的笔记组织结构
- 支持层级

#### note_user_categories - 笔记文件夹关联
- 多对多关系

### 互动相关

#### comments - 评论
- 支持两级回复（parent_id, root_id）
- 软删除（is_deleted）

#### comment_likes - 评论点赞
- 唯一约束：(user_id, comment_id)

#### comment_mentions - 评论@提及

#### note_likes - 笔记点赞
- 唯一约束：(user_id, note_id)

#### note_favorites - 笔记收藏
- 唯一约束：(user_id, note_id)

### 其他

#### notifications - 通知
- 类型：system/comment/reply/like/favorite/mention
- 已读状态

#### user_note_history - 浏览历史
- 记录用户访问笔记的时间

#### note_stats_daily - 按日统计
- 每日数据快照（用于趋势分析）

#### note_export_logs - 导出日志
- 记录谁在什么时候导出了哪篇笔记

## 索引策略

### 主键索引
所有表的 `id` 字段均为自增主键。

### 唯一索引
- users: username, email
- categories: name, slug
- tags: name, slug
- note_likes: (user_id, note_id)
- note_favorites: (user_id, note_id)
- comment_likes: (user_id, comment_id)

### 普通索引
- notes: (author_id), (status), (published_at)
- note_versions: (note_id), (audit_status)
- comments: (note_id), (author_id), (root_id)
- notifications: (user_id, is_read), (type)
- user_note_history: (user_id, viewed_at)

## 性能优化建议

1. **读写分离**: 对于高并发场景，可配置主从复制
2. **缓存策略**: 热门笔记、分类列表等可使用 Redis 缓存
3. **分表策略**: 当数据量达到百万级时，考虑按时间分表
4. **全文搜索**: 对于复杂搜索需求，建议引入 Elasticsearch

## 数据备份

建议每日进行全量备份：

```bash
mysqldump -u root -p techshare > backup_$(date +%Y%m%d).sql
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