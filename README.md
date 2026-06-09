# LLM API Proxy

企业级 AI Gateway + 工作审计平台

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + TailwindCSS |
| 后端 | Node.js 22 + Express + TypeScript + Prisma |
| 数据库 | SQLite |
| 认证 | JWT + BCrypt |
| 部署 | Docker |

## 快速启动

### 环境要求

- Node.js >= 22
- npm >= 10

### 本地开发

```bash
# 1. 启动后端
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# 2. 启动前端 (新终端)
cd frontend
npm install
npm run dev
```

前端访问：http://localhost:5173
后端 API：http://localhost:8080

### 默认管理员

| 用户名 | 密码 |
|--------|------|
| admin | welcome123 |

首次登录后建议修改密码。

### Docker 部署

```bash
docker compose up -d
```

访问：http://localhost:8080

## 项目结构

```
llm_api_proxy/
├── frontend/          # Vue 3 前端
│   └── src/
│       ├── api/       # API 请求层
│       ├── components/# 通用组件
│       ├── layouts/   # 布局组件
│       ├── router/    # 路由配置
│       ├── stores/    # Pinia 状态管理
│       ├── views/     # 页面视图
│       └── utils/     # 工具函数
├── backend/           # Node.js 后端
│   ├── prisma/        # Prisma Schema
│   └── src/
│       ├── config/    # 配置
│       ├── controllers/ # 控制器
│       ├── middleware/   # 中间件
│       ├── routes/       # 路由
│       ├── services/     # 业务逻辑
│       ├── validators/   # 参数校验
│       └── utils/        # 工具函数
├── data/              # SQLite 数据库文件
├── logs/              # 日志文件
├── docker-compose.yml
└── Dockerfile
```

## API 规范

### 统一返回格式

```json
{ "code": 0, "message": "success", "data": {} }
```

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| GET | /api/health | 健康检查 |

## 开发阶段

- [x] Phase 1 — 项目基础框架
- [ ] Phase 2 — 员工管理
- [ ] Phase 3 — API Key 管理
- [ ] Phase 4 — 模型管理
- [ ] Phase 5 — AI Gateway
- [ ] Phase 6 — 对话审计
- [ ] Phase 7 — 工作日报
- [ ] Phase 8 — Prompt 评价系统
- [ ] Phase 9 — Dashboard 完善
- [ ] Phase 10 — 系统发布版

## License

Proprietary — LLM API Proxy LLM API Proxy
