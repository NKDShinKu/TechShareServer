-- TechShareHub 初始化数据脚本
-- 使用方法: mysql -u root -p techshare < docs/init.sql

-- 创建管理员账户
-- 用户名: admin, 密码: admin123
INSERT INTO users (username, email, password_hash, nickname, role, status, created_at, updated_at)
VALUES (
  'admin',
  'admin@techshare.com',
  '$2b$10$HsFIVlJZsCpaHxEwQ597o.2ph4GUc5.Qe.3JXwnuNRXb8I0h9v/fe',
  '管理员',
  'ADMIN',
  0,
  NOW(),
  NOW()
);

-- 创建管理员用户设置
INSERT INTO user_settings (user_id, theme, editor_theme, created_at, updated_at)
SELECT id, 'light', 'default', NOW(), NOW() FROM users WHERE username = 'admin';

-- 创建测试用户
-- 用户名: testuser, 密码: test123
INSERT INTO users (username, email, password_hash, nickname, role, status, created_at, updated_at)
VALUES (
  'testuser',
  'test@techshare.com',
  '$2b$10$SnJRlzmzpS/i8agDf8YOWe7juxqnGCNgt/3ocwRnXwGVm4xeB0CQC',
  '测试用户',
  'USER',
  0,
  NOW(),
  NOW()
);

-- 创建测试用户设置
INSERT INTO user_settings (user_id, theme, editor_theme, created_at, updated_at)
SELECT id, 'system', 'blue', NOW(), NOW() FROM users WHERE username = 'testuser';

-- 创建默认分类
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

-- 创建常用标签
INSERT INTO tags (name, slug, created_at) VALUES
('JavaScript', 'javascript', NOW()),
('TypeScript', 'typescript', NOW()),
('Vue', 'vue', NOW()),
('React', 'react', NOW()),
('Node.js', 'nodejs', NOW()),
('Python', 'python', NOW()),
('Java', 'java', NOW()),
('Go', 'go', NOW()),
('PHP', 'php', NOW()),
('C++', 'cpp', NOW()),
('Rust', 'rust', NOW()),
('MySQL', 'mysql', NOW()),
('PostgreSQL', 'postgresql', NOW()),
('MongoDB', 'mongodb', NOW()),
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
('GraphQL', 'graphql', NOW()),
('RESTful', 'restful', NOW()),
('CI/CD', 'cicd', NOW()),
('Linux', 'linux', NOW()),
('Nginx', 'nginx', NOW()),
('Elasticsearch', 'elasticsearch', NOW());

-- 创建系统欢迎通知给所有用户
INSERT INTO notifications (user_id, type, title, content, is_read, created_at)
SELECT 
  id,
  'system',
  '欢迎使用 TechShareHub',
  '欢迎来到技术笔记分享平台！在这里，你可以创作、分享和学习技术知识。',
  0,
  NOW()
FROM users;

-- 输出初始化结果
SELECT '初始化完成！' AS status;
SELECT '创建的用户：' AS info;
SELECT username, email, role FROM users;
SELECT '创建的分类：' AS info;
SELECT name, slug FROM categories;
SELECT '创建的标签数量：' AS info;
SELECT COUNT(*) as count FROM tags;

