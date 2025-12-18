# 部署指南

## 开发环境部署

### 1. 环境准备

- Node.js >= 18.x
- MySQL >= 8.0
- npm 或 yarn

### 2. 安装依赖

```bash
cd TechShareServer
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

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

### 4. 创建数据库

```bash
mysql -u root -p
```

```sql
CREATE DATABASE techshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动服务

```bash
# 开发模式
npm run start:dev

# 服务将运行在 http://localhost:3000
# API 文档: http://localhost:3000/api/docs
```

## 生产环境部署

### 1. 构建项目

```bash
npm run build
```

### 2. 使用 PM2 管理进程

#### 安装 PM2

```bash
npm install -g pm2
```

#### 创建 PM2 配置文件 `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'techshare-api',
    script: './dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

#### 启动应用

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx 反向代理

#### 安装 Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/techshare`:

```nginx
server {
    listen 80;
    server_name api.techshare.com;

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件
    location /uploads/ {
        alias /path/to/TechShareServer/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 限制上传大小
    client_max_body_size 10M;
}
```

#### 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/techshare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL 证书（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.techshare.com
```

## Docker 部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: techshare
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  api:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USERNAME=root
      - DB_PASSWORD=your_password
      - DB_DATABASE=techshare
    depends_on:
      - mysql
    volumes:
      - ./uploads:/app/uploads

volumes:
  mysql_data:
```

### 3. 启动容器

```bash
docker-compose up -d
```

## 数据库迁移

生产环境建议关闭 `synchronize`，使用 Migration：

### 1. 生成迁移文件

```bash
npm run typeorm migration:generate -- -n InitialSchema
```

### 2. 执行迁移

```bash
npm run typeorm migration:run
```

### 3. 回滚迁移

```bash
npm run typeorm migration:revert
```

## 监控与日志

### 1. PM2 监控

```bash
pm2 monit
```

### 2. 日志查看

```bash
# 查看日志
pm2 logs

# 清空日志
pm2 flush
```

### 3. 日志轮转

创建 `pm2-logrotate` 配置：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 性能优化

### 1. 数据库连接池

在 `database.config.ts` 中配置：

```typescript
extra: {
  connectionLimit: 10,
}
```

### 2. 启用 Gzip 压缩

```bash
npm install compression
```

在 `main.ts` 中：

```typescript
import * as compression from 'compression';
app.use(compression());
```

### 3. Redis 缓存

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-store
```

## 安全建议

1. **环境变量**: 不要将 `.env` 文件提交到版本控制
2. **JWT 密钥**: 使用足够复杂的随机字符串
3. **数据库密码**: 使用强密码
4. **CORS**: 仅允许信任的域名
5. **限流**: 使用 `@nestjs/throttler` 防止 DDoS
6. **Helmet**: 使用 `helmet` 中间件增强安全性

## 常见问题

### 1. 数据库连接失败

检查：
- 数据库是否启动
- 连接信息是否正确
- 防火墙是否开放端口

### 2. 文件上传失败

检查：
- `uploads` 目录是否有写权限
- `MAX_FILE_SIZE` 配置是否合理
- Nginx `client_max_body_size` 是否足够大

### 3. JWT 验证失败

检查：
- Token 是否过期
- JWT_SECRET 是否一致
- Authorization header 格式是否正确

