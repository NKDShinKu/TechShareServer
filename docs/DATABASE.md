# 数据库设计文档

## 数据库概览

- **数据库类型**: MySQL 8.0
- **字符集**: utf8mb4
- **时区**: UTC
- **表数量**: 21 张

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

