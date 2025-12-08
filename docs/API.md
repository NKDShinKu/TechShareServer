# API 接口文档

完整的 API 文档请访问: http://localhost:3000/api/docs（Swagger UI）

## 响应格式

### 成功响应

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    // 实际数据
  },
  "timestamp": "2025-12-05T10:00:00.000Z"
}
```

### 错误响应

```json
{
  "statusCode": 400,
  "timestamp": "2025-12-05T10:00:00.000Z",
  "path": "/api/notes",
  "message": "验证失败: title 不能为空"
}
```

## 认证方式

大多数接口需要 JWT 认证，在请求头中添加：

```
Authorization: Bearer <token>
```

## 分页参数

支持分页的接口通常接受以下查询参数：

- `page`: 页码（从 1 开始，默认 1）
- `limit`: 每页数量（默认 10）

## 常见状态码

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权（未登录或 Token 无效）
- `403`: 禁止访问（权限不足）
- `404`: 资源不存在
- `409`: 冲突（如用户名已存在）
- `500`: 服务器内部错误

