# 初始化数据指南

## 创建管理员账户

启动服务后，首先需要创建管理员账户。

### 方法一：通过 API 注册并手动修改数据库

1. 使用注册接口创建用户：

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@techshare.com",
    "password": "admin123",
    "nickname": "管理员"
  }'
```

2. 在数据库中将该用户的角色修改为 ADMIN：

```sql
UPDATE users SET role = 'ADMIN' WHERE username = 'admin';
```

### 方法二：直接插入数据库

```sql
-- 密码为 admin123（使用 bcrypt 加密，成本因子 10）
INSERT INTO users (username, email, password_hash, nickname, role, created_at, updated_at)
VALUES (
  'admin',
  'admin@techshare.com',
  '$2b$10$rOHkL0zvVfz9WNbL9L8xXOmYqC5k5bHXhQJmQOQoZxN3xY8XkzQWS',
  '管理员',
  'ADMIN',
  NOW(),
  NOW()
);

-- 创建用户设置
INSERT INTO user_settings (user_id, created_at, updated_at)
SELECT id, NOW(), NOW() FROM users WHERE username = 'admin';
```

## 创建默认分类

```sql
INSERT INTO categories (name, slug, is_public, created_at, updated_at) VALUES
('前端开发', 'frontend', 1, NOW(), NOW()),
('后端开发', 'backend', 1, NOW(), NOW()),
('移动开发', 'mobile', 1, NOW(), NOW()),
('数据库', 'database', 1, NOW(), NOW()),
('DevOps', 'devops', 1, NOW(), NOW()),
('人工智能', 'ai', 1, NOW(), NOW()),
('算法与数据结构', 'algorithms', 1, NOW(), NOW()),
('架构设计', 'architecture', 1, NOW(), NOW()),
('工具与效率', 'tools', 1, NOW(), NOW()),
('其他', 'other', 1, NOW(), NOW());
```

## 创建常用标签

```sql
INSERT INTO tags (name, slug, created_at) VALUES
('JavaScript', 'javascript', NOW()),
('TypeScript', 'typescript', NOW()),
('Vue', 'vue', NOW()),
('React', 'react', NOW()),
('Node.js', 'nodejs', NOW()),
('Python', 'python', NOW()),
('Java', 'java', NOW()),
('Go', 'go', NOW()),
('MySQL', 'mysql', NOW()),
('Redis', 'redis', NOW()),
('Docker', 'docker', NOW()),
('Kubernetes', 'k8s', NOW()),
('AWS', 'aws', NOW()),
('Git', 'git', NOW()),
('性能优化', 'performance', NOW()),
('安全', 'security', NOW()),
('测试', 'testing', NOW()),
('设计模式', 'design-patterns', NOW()),
('微服务', 'microservices', NOW()),
('GraphQL', 'graphql', NOW());
```

## 创建测试用户

```sql
-- 密码为 test123
INSERT INTO users (username, email, password_hash, nickname, role, created_at, updated_at)
VALUES (
  'testuser',
  'test@techshare.com',
  '$2b$10$rOHkL0zvVfz9WNbL9L8xXOmYqC5k5bHXhQJmQOQoZxN3xY8XkzQWS',
  '测试用户',
  'USER',
  NOW(),
  NOW()
);

-- 创建用户设置
INSERT INTO user_settings (user_id, created_at, updated_at)
SELECT id, NOW(), NOW() FROM users WHERE username = 'testuser';
```

## 初始化脚本

可以创建一个 SQL 脚本文件 `init.sql`，包含以上所有内容：

```bash
mysql -u root -p techshare < init.sql
```

## 验证初始化

### 1. 测试管理员登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 2. 获取分类列表

```bash
curl http://localhost:3000/api/categories
```

### 3. 获取标签列表

```bash
curl http://localhost:3000/api/tags
```

## 注意事项

1. **密码安全**: 示例中的密码哈希是 `admin123` 和 `test123` 的 bcrypt 加密结果（成本因子 10）。生产环境务必使用强密码并重新生成哈希。

2. **修改密码哈希**: 可以使用以下 Node.js 代码生成：

```javascript
const bcrypt = require('bcrypt');
const password = 'your_password';
const hash = await bcrypt.hash(password, 10);
console.log(hash);
```

3. **数据备份**: 在执行初始化脚本前，建议先备份现有数据库。

4. **权限检查**: 初始化完成后，登录管理员账户，确认可以访问管理员接口（如笔记审核）。

## 清空数据库

如果需要重新初始化，可以使用以下命令清空所有表：

```sql
-- 谨慎使用！这将删除所有数据
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE auth_refresh_tokens;
TRUNCATE TABLE note_export_logs;
TRUNCATE TABLE note_stats_daily;
TRUNCATE TABLE user_note_history;
TRUNCATE TABLE notifications;
TRUNCATE TABLE note_favorites;
TRUNCATE TABLE note_likes;
TRUNCATE TABLE comment_mentions;
TRUNCATE TABLE comment_likes;
TRUNCATE TABLE comments;
TRUNCATE TABLE note_user_categories;
TRUNCATE TABLE user_categories;
TRUNCATE TABLE note_attachments;
TRUNCATE TABLE note_version_tags;
TRUNCATE TABLE note_versions;
TRUNCATE TABLE notes;
TRUNCATE TABLE tags;
TRUNCATE TABLE categories;
TRUNCATE TABLE user_settings;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;
```

## 快速开始完整流程

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE techshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 启动服务（TypeORM 会自动创建表结构）
cd TechShareServer
npm run start:dev

# 3. 等待服务启动完成后，执行初始化脚本
mysql -u root -p techshare < docs/init.sql

# 4. 访问 Swagger 文档测试接口
# http://localhost:3000/api/docs
```

