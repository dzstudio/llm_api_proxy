# LLM API Proxy

> 企业级 AI Gateway + 工作审计平台 —— 统一接入多家大模型,集中管理 API Key,记录并分析团队的 AI Coding 使用情况。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/vue-3-42b883.svg)](https://vuejs.org/)

LLM API Proxy 把 DeepSeek、Kimi、MiniMax 等上游大模型统一收敛到一个网关后面,对外同时提供 **Anthropic 兼容** 与 **OpenAI 兼容** 两种协议。团队成员用统一的 API Key 接入 Claude Code / Cursor / Cline 等 AI Coding 工具,管理员则可以在后台审计每一次调用、统计 Token 用量、自动生成工作日报并给 Prompt 打分。

---

## ✨ 核心特性

- **AI Gateway** — 同时兼容 Anthropic `/v1/messages` 与 OpenAI `/v1/chat/completions`,支持 SSE 流式响应
- **多模型接入** — 统一管理多家供应商,支持启用/禁用与默认模型路由(三级回退)
- **API Key 管理** — 为员工签发 `sk_llm_` 前缀的密钥,绑定默认模型,明文仅展示一次
- **对话审计** — 完整记录用户 Prompt 与响应,自动过滤系统提示词,Token 估算与分布统计
- **工作日报** — 每日 00:05 自动生成,包含 Prompt 数 / Token 用量 / 员工排行
- **Prompt 评价** — 调用评价模型对 Prompt 质量做多维度自动打分
- **Dashboard** — 会话数 / Token 用量 / 日报 / 评分总览,含员工排行与模型分布
- **角色权限** — ADMIN / USER 两级 RBAC,前后端一致

## 🧱 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + TailwindCSS v4 |
| 后端 | Node.js 22 + Express + TypeScript + Prisma |
| 数据库 | SQLite |
| 认证 | JWT + BCrypt + SHA256(API Key) |
| 部署 | Docker / Docker Compose + Nginx |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 22
- npm >= 10
- Docker & Docker Compose(容器部署时需要)

### 本地开发

```bash
# 1. 启动后端(默认 http://localhost:8080)
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# 2. 启动前端(新终端,默认 http://localhost:5173,/api 会代理到 8080)
cd frontend
npm install
npm run dev
```

### Docker 部署(推荐)

```bash
cp .env.example .env      # 按需修改端口与密钥
docker compose up -d --build

docker compose logs -f    # 查看日志
docker compose down       # 停止
```

启动后访问 **http://localhost:8088**。

数据持久化在 `./data`,日志在 `./logs`,容器每次启动会自动执行 `prisma migrate deploy`,重建镜像不会丢数据。

### 🔑 默认管理员

| 用户名 | 密码 |
|--------|------|
| `admin` | `welcome123` |

> ⚠️ **安全提醒:默认账号密码仅用于开箱体验,生产环境请务必在 `.env` 中修改 `JWT_SECRET` 与 `ADMIN_DEFAULT_PASSWORD`,并在首次登录后立即改密。**

首次登录后,建议按以下顺序配置:

1. **系统设置** → 修改管理员密码
2. **员工管理** → 为团队成员创建账号
3. **模型管理** → 配置上游 LLM 模型(Base URL + API Key)
4. **API Key 管理** → 为员工签发网关密钥
5. 员工在「接入信息」页面获取专属接入地址

---

## ⚙️ 环境变量

复制 `.env.example` 为 `.env` 后修改:

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8088` | 服务端口 |
| `DATABASE_URL` | `file:/app/data/app.db?connection_limit=1` | SQLite 数据库路径 |
| `JWT_SECRET` | `llm-api-proxy-dev-secret-change-me` | JWT 签名密钥,**生产环境必改** |
| `JWT_EXPIRATION` | `24h` | 登录有效期 |
| `ADMIN_DEFAULT_USERNAME` | `admin` | 默认管理员用户名 |
| `ADMIN_DEFAULT_PASSWORD` | `welcome123` | 默认管理员密码,**生产环境必改** |

生成一个强随机密钥:

```bash
openssl rand -hex 32
```

---

## 🔌 AI Gateway 接入

网关同时提供两种协议,员工在「接入信息」页面可以直接复制对应配置。

**OpenAI 兼容**(Cursor / Cline / 通用 SDK):

```bash
curl http://localhost:8088/api/llm/v1/chat/completions \
  -H "Authorization: Bearer sk_llm_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

**Anthropic 兼容**(Claude Code / CC-Switch):

```bash
curl http://localhost:8088/api/llm/v1/messages \
  -H "x-api-key: sk_llm_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-5",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

**模型解析规则**(三级回退):

1. 请求中的 `model` 若能匹配到已启用的模型 → 直接使用
2. 否则回退到该 API Key 绑定的默认模型
3. 再回退到任意一个已启用模型

---

## 📁 项目结构

```
llm_api_proxy/
├── frontend/                  # Vue 3 前端
│   └── src/
│       ├── api/               # API 请求层(axios 实例 + 各模块接口)
│       ├── components/        # 通用组件
│       ├── layouts/           # MainLayout(侧边栏 + 顶栏)
│       ├── router/            # 路由配置 + 导航守卫
│       ├── stores/            # Pinia 状态管理(auth)
│       ├── utils/             # 日期格式化等工具函数
│       └── views/             # 页面视图
├── backend/                   # Node.js 后端
│   ├── prisma/                # Prisma Schema + 数据库迁移
│   └── src/
│       ├── config/            # 环境配置
│       ├── controllers/       # 路由控制器
│       ├── gateway/           # AI Gateway(Anthropic / OpenAI 兼容代理)
│       ├── middleware/        # JWT 认证 + 鉴权中间件
│       ├── routes/            # Express 路由定义
│       ├── scheduler/         # 日报定时任务(cron)
│       ├── services/          # 业务逻辑层
│       ├── validators/        # Zod 参数校验
│       └── utils/             # 工具函数(seed / jwt)
├── data/                      # SQLite 数据库(volume 挂载,不入库)
├── logs/                      # 日志目录
├── docker-compose.yml
├── Dockerfile
└── README.md
```

**分层约定:** `Route → Controller → Service → Prisma → SQLite`,校验由 Zod Validator 承担。Controller 捕获所有异常并返回结构化 JSON,Service 抛出 `Error` 由 Controller 统一处理。

---

## 📡 API 规范

所有接口统一返回:

```json
{ "code": 0, "message": "success", "data": {} }
```

`code: 0` 为成功;`401` 认证失败;`403` 无权限;`404` 未找到;`500` 服务端错误。

### 端点一览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | — | 用户登录 |
| GET | `/api/auth/me` | JWT | 获取当前用户信息 |
| GET | `/api/health` | — | 健康检查 |
| GET | `/api/users` | Admin | 员工列表 |
| POST | `/api/users` | Admin | 创建员工 |
| PUT | `/api/users/:id` | Admin | 更新员工 |
| DELETE | `/api/users/:id` | Admin | 删除员工 |
| GET | `/api/api-keys` | Admin | API Key 列表 |
| POST | `/api/api-keys` | Admin | 创建 API Key |
| PUT | `/api/api-keys/:id` | Admin | 更新 API Key |
| DELETE | `/api/api-keys/:id` | Admin | 删除 API Key |
| GET | `/api/models` | Admin | 模型列表 |
| POST | `/api/models` | Admin | 添加模型 |
| PUT | `/api/models/:id` | Admin | 更新模型 |
| DELETE | `/api/models/:id` | Admin | 删除模型 |
| POST | `/api/llm/v1/chat/completions` | API Key | OpenAI 兼容网关代理 |
| POST | `/api/llm/v1/messages` | API Key | Anthropic 兼容网关代理 |
| GET | `/api/conversations` | Admin | 对话审计列表 |
| GET | `/api/conversations/:id` | Admin | 对话详情 |
| GET | `/api/conversations/stats` | Admin | 对话统计 |
| GET | `/api/reports` | Admin | 日报列表 |
| GET | `/api/reports/:id` | Admin | 日报详情 |
| GET | `/api/reports/stats` | Admin | 日报统计 |
| GET | `/api/reviews` | Admin | 评价列表 |
| GET | `/api/reviews/stats` | Admin | 评价统计 |
| POST | `/api/reviews/evaluate/:id` | Admin | 评价 Prompt |
| GET | `/api/reviews/:conversationId` | Admin | 查看评价结果 |

---

## 🌐 生产部署(域名 + HTTPS)

推荐用 Nginx 反向代理并配置 Let's Encrypt 证书。以 Ubuntu 22.04 为例:

```bash
# 1. 安装 Docker 与 Nginx
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER     # 重新登录使权限生效
sudo apt install nginx certbot python3-certbot-nginx -y

# 2. 拉取项目并启动
git clone <your-repo-url> /opt/llm_api_proxy
cd /opt/llm_api_proxy
cp .env.example .env && nano .env   # 修改 JWT_SECRET / ADMIN_DEFAULT_PASSWORD
docker compose up -d --build
```

Nginx 配置 `/etc/nginx/sites-available/llm-api-proxy`:

```nginx
server {
    listen 80;
    server_name ai.yourdomain.com;   # 替换为你的域名

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 流式响应支持(AI Gateway 必需)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/llm-api-proxy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ai.yourdomain.com     # 自动签发并配置 HTTPS
```

绑定域名后,前端会自动按当前访问域名展示 Gateway 接入地址:

- 接入地址:`https://ai.yourdomain.com/api/llm`
- Anthropic 兼容:`https://ai.yourdomain.com/api/llm/v1/messages`
- OpenAI 兼容:`https://ai.yourdomain.com/api/llm/v1/chat/completions`

**后续更新代码:**

```bash
cd /opt/llm_api_proxy
git pull
docker compose up -d --build    # 数据通过 volume 持久化,不会丢失
```

---

## 🔒 安全须知

- `.env` 已被 `.gitignore` 忽略,**切勿提交任何真实密钥**
- 生产环境务必替换 `JWT_SECRET`(建议 `openssl rand -hex 32`)与 `ADMIN_DEFAULT_PASSWORD`
- API Key 以 SHA256 哈希形式存储于 `sys_api_key` 表,明文仅在创建时展示一次
- 数据目录 `data/` 中包含业务数据,已排除出仓库,请自行做好备份

---

## 🗺️ 开发路线

- [x] Phase 1 — 项目基础框架
- [x] Phase 2 — 员工管理
- [x] Phase 3 — API Key 管理
- [x] Phase 4 — 模型管理
- [x] Phase 5 — AI Gateway
- [x] Phase 6 — 对话审计
- [x] Phase 7 — 工作日报
- [x] Phase 8 — Prompt 评价系统
- [x] Phase 9 — Dashboard 完善
- [x] Phase 10 — 系统发布版

---

## 🤝 贡献

欢迎提交 Issue 与 Pull Request。

1. Fork 本仓库并创建特性分支:`git checkout -b feature/your-feature`
2. 提交改动:`git commit -m "feat: your feature"`
3. 推送并发起 Pull Request

---

## 📄 License

本项目基于 [MIT License](./LICENSE) 开源。

```
MIT License

Copyright (c) 2026 Dillon-Zhang
```
