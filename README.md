# LLM API Proxy

企业级 AI Gateway + 工作审计平台

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + TailwindCSS v4 |
| 后端 | Node.js 22 + Express + TypeScript + Prisma |
| 数据库 | SQLite |
| 认证 | JWT + BCrypt + SHA256 API Key |
| 部署 | Docker / Docker Compose |

## 快速启动

### 环境要求

- Node.js >= 22
- npm >= 10
- Docker & Docker Compose (容器部署)

### 本地开发

```bash
# 1. 启动后端
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev        # http://localhost:8080

# 2. 启动前端 (新终端)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### 默认管理员

| 用户名 | 密码 |
|--------|------|
| admin | welcome123 |

### Docker 部署

```bash
# 构建并启动
docker compose up -d

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

访问：http://localhost:8080

数据持久化在 `./data` 目录，日志在 `./logs` 目录。

---

## 服务器部署完整流程

以下以 Ubuntu 22.04 为例，其他 Linux 发行版类似。

### 1. 环境准备

```bash
# 安装 Docker（如已安装可跳过）
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
# 重新登录使权限生效

# 安装 Git
sudo apt install git -y
```

### 2. 拉取项目

```bash
git clone <你的仓库地址> /opt/llm_api_proxy
cd /opt/llm_api_proxy
```

### 3. 配置环境变量（可选）

```bash
# 复制并编辑环境变量（可选，默认值可直接使用）
cp .env.example .env  # 如没有 .env.example，直接创建 .env
nano .env
```

关键变量：

| 变量 | 说明 | 建议 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | **务必修改为随机字符串** |
| `ADMIN_DEFAULT_PASSWORD` | 管理员初始密码 | **务必修改，首次登录后应立即改密** |
| `JWT_EXPIRATION` | 登录有效期 | 默认 24h |

### 4. 启动服务

```bash
docker compose up -d
```

访问 `http://<服务器IP>:8080`，使用管理员账号登录。

### 5. 首次登录注意事项

- 默认用户名：`admin`，密码：`welcome123`（或你在 `.env` 中设置的值）
- **首次登录后立即修改管理员密码**（系统设置 → 修改密码）
- 在「员工管理」中为团队成员创建账号
- 在「模型管理」中配置上游 LLM 模型
- 在「API Key 管理」中为员工创建 API Key

---

## 后续更新流程

在服务器上执行以下命令拉取新代码并重新部署：

```bash
cd /opt/llm_api_proxy

# 拉取最新代码
git pull

# 重新构建并启动（数据库文件通过 volume 持久化，不会丢失）
docker compose up -d --build

# 查看启动日志确认无报错
docker compose logs -f
```

> **重要：** 数据库文件 `data/app.db` 通过 Docker volume 挂载到宿主机，重新构建容器不会清空数据。每次启动时容器会自动执行 `prisma migrate deploy`，确保数据库结构同步，不会造成数据丢失。

---

## 绑定域名访问

推荐使用 Nginx 反向代理，将域名指向服务器后，配置 SSL 证书实现 HTTPS 访问。

### 1. 解析域名

在 DNS 服务商处添加 A 记录，将域名（如 `ai.yourdomain.com`）指向服务器 IP。

### 2. 安装 Nginx 和 Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 3. 配置 Nginx 反向代理

创建配置文件 `/etc/nginx/sites-available/llm-api-proxy`：

```nginx
server {
    listen 80;
    server_name ai.yourdomain.com;   # 替换为你的域名

    # Web 管理后台 + LLM Gateway API
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 流式响应支持（LLM Gateway 需要）
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/llm-api-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 SSL 证书

```bash
sudo certbot --nginx -d ai.yourdomain.com
```

按提示操作，Certbot 会自动修改 Nginx 配置并获取 Let's Encrypt 免费证书。

### 5. 验证

访问 `https://ai.yourdomain.com`，确认 Web 管理后台正常显示。

### 域名下的 Gateway 接入信息

前端页面会自动根据当前访问域名展示对应的 Gateway 地址。例如绑定了 `https://ai.yourdomain.com`：

- **接入地址（CC-Switch / Claude Code）：** `https://ai.yourdomain.com/api/llm`
- **Anthropic 兼容调用：** `https://ai.yourdomain.com/api/llm/v1/messages`
- **OpenAI 兼容调用：** `https://ai.yourdomain.com/api/llm/v1/chat/completions`

员工在「接入信息」页面看到的 curl 示例也会自动使用当前域名，无需手动修改。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 8080 | 服务端口 |
| JWT_SECRET | llm-api-proxy-dev-secret-change-me | JWT 签名密钥 |
| JWT_EXPIRATION | 24h | JWT 过期时间 |
| ADMIN_DEFAULT_USERNAME | admin | 默认管理员用户名 |
| ADMIN_DEFAULT_PASSWORD | welcome123 | 默认管理员密码 |

## 项目结构

```
llm_api_proxy/
├── frontend/                  # Vue 3 前端
│   └── src/
│       ├── api/               # API 请求层 (axios)
│       ├── components/        # 通用组件
│       ├── layouts/           # MainLayout (侧边栏 + 顶栏)
│       ├── router/            # 路由配置 + 导航守卫
│       ├── stores/            # Pinia 状态管理 (auth)
│       ├── views/             # 页面视图
│       └── utils/             # 日期格式化等工具函数
├── backend/                   # Node.js 后端
│   ├── prisma/                # Prisma Schema + 数据库迁移
│   └── src/
│       ├── config/            # 环境配置
│       ├── controllers/       # 路由控制器
│       ├── gateway/           # AI Gateway (OpenAI 兼容代理)
│       ├── middleware/        # JWT 认证 + 鉴权中间件
│       ├── routes/            # Express 路由定义
│       ├── scheduler/         # 日报定时任务 (cron)
│       ├── services/          # 业务逻辑层
│       ├── validators/        # Zod 参数校验
│       └── utils/             # 工具函数
├── data/              # SQLite 数据库文件
├── logs/              # 日志文件
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API 规范

### 统一返回格式

```json
{ "code": 0, "message": "success", "data": {} }
```

- `code: 0` — 成功；其他值 — 错误码
- `message` — 提示信息
- `data` — 返回数据

### API 端点

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | /api/auth/login | — | 用户登录 |
| GET | /api/auth/me | JWT | 获取当前用户信息 |
| GET | /api/health | — | 健康检查 |
| GET | /api/users | Admin | 员工列表 |
| POST | /api/users | Admin | 创建员工 |
| PUT | /api/users/:id | Admin | 更新员工 |
| DELETE | /api/users/:id | Admin | 删除员工 |
| GET | /api/api-keys | Admin | API Key 列表 |
| POST | /api/api-keys | Admin | 创建 API Key |
| PUT | /api/api-keys/:id | Admin | 更新 API Key |
| DELETE | /api/api-keys/:id | Admin | 删除 API Key |
| GET | /api/models | Admin | 模型列表 |
| POST | /api/models | Admin | 添加模型 |
| PUT | /api/models/:id | Admin | 更新模型 |
| DELETE | /api/models/:id | Admin | 删除模型 |
| POST | /api/llm/v1/chat/completions | API Key | AI Gateway 代理 |
| GET | /api/conversations | Admin | 对话审计列表 |
| GET | /api/conversations/:id | Admin | 对话详情 |
| GET | /api/conversations/stats | Admin | 对话统计 |
| GET | /api/reports | Admin | 日报列表 |
| GET | /api/reports/:id | Admin | 日报详情 |
| GET | /api/reports/stats | Admin | 日报统计 |
| GET | /api/reviews | Admin | 评价列表 |
| GET | /api/reviews/stats | Admin | 评价统计 |
| POST | /api/reviews/evaluate/:id | Admin | 评价 Prompt |
| GET | /api/reviews/:conversationId | Admin | 查看评价结果 |

## 功能模块

- **AI Gateway** — OpenAI 兼容 `/v1/chat/completions` 代理，支持流式响应，自动过滤系统提示词
- **员工管理** — 员工 CRUD，角色管理 (Admin / User)，状态控制
- **API Key 管理** — SHA256 哈希存储，绑定默认模型，一次性明文展示
- **模型管理** — 多供应商模型配置，启用/禁用，评价模型标记
- **对话审计** — 用户 Prompt 记录，Token 估算与统计，模型使用分布
- **工作日报** — 每日自动生成 (00:05)，Prompt/Totoken 统计，员工排行
- **Prompt 评价** — AI 自动评分 (5 维度)，评分分布，最高评分展示
- **Dashboard** — 总会话数 / Token 用量 / 累计日报 / 平均评分，员工排行，模型分布

## 开发阶段

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

## License

Proprietary — LLM API Proxy LLM API Proxy
