⸻

LLM API Proxy

Version: 1.0

⸻

项目简介

项目名称：

LLM API Proxy

英文名称：

LLM API Proxy

简称：

LLM API Proxy

⸻

项目目标

构建一个企业内部 AI 工作平台。

员工继续使用：

* Claude Code
* Cursor
* Cline
* Trae

进行开发工作。

平台不提供聊天窗口。

平台主要负责：

* AI Gateway
* 模型转发
* API Key 管理
* 员工管理
* 对话记录审计
* Prompt 质量分析
* AI 工作日报
* 模型管理

⸻

产品定位

企业级 AI Gateway + 工作审计平台

面向：

* 软件开发团队
* AI研发团队
* 中小企业技术团队

⸻

品牌规范

企业名称：

LLM API Proxy

英文：

LLM API Proxy

⸻

品牌主色：

#005d9c

⸻

辅助色：

#0ea5e9

#10b981

#f59e0b

#ef4444

⸻

背景色：

#f8fafc

⸻

卡片颜色：

#ffffff

⸻

UI设计要求

参考：

* OpenAI Platform
* Claude Console
* Vercel Dashboard
* Linear
* Notion

⸻

整体风格：

* 简洁
* 高级
* 企业级
* 科技感
* 大量留白

⸻

统一规范：

* 圆角 12px
* 间距 24px
* 响应式布局
* 浅色主题
* 预留暗色模式能力

⸻

禁止：

* Bootstrap风格
* AdminLTE风格
* 花哨渐变
* 彩虹配色
* 高饱和度UI

⸻

技术架构

前端

Vue3

TypeScript

Vite

Pinia

Vue Router

Axios

TailwindCSS

Shadcn Vue

ECharts

⸻

后端

Node.js 22

Express.js

TypeScript

Prisma

jsonwebtoken

bcryptjs

zod

⸻

数据库

SQLite

数据库文件：

data/app.db

⸻

部署

Docker

单容器部署

⸻

日志

logs/

按天滚动

⸻

默认管理员

系统首次启动自动创建：

用户名：

admin

密码：

welcome123

首次登录必须修改密码。

⸻

用户角色

仅允许两种角色

ADMIN

USER

禁止复杂RBAC。

⸻

系统菜单

Dashboard

员工管理

模型管理

API Key管理

工作记录

对话审计

系统设置

⸻

数据库设计

sys_user

id

username

password

real_name

email

department

role

status

last_login_time

create_time

update_time

⸻

sys_api_key

id

user_id

api_key

default_model_id

status

create_time

update_time

⸻

sys_model

id

name

provider

model_name

base_url

api_key

enabled

max_tokens

temperature

timeout_seconds

is_review_model

create_time

update_time

⸻

sys_setting

id

setting_key

setting_value

description

⸻

conversation

id

user_id

model_id

session_id

title

summary

token_count

message_count

cost

create_time

update_time

⸻

message

id

conversation_id

role

content

tokens

create_time

⸻

daily_report

id

user_id

report_date

summary

prompt_count

token_count

score

review_content

create_time

⸻

prompt_review

id

conversation_id

review_model_id

score

strengths

weaknesses

suggestions

create_time

⸻

AI Gateway设计

统一入口：

/api/llm/v1/chat/completions

兼容：

OpenAI Chat Completions API

⸻

支持供应商：

DeepSeek

Kimi

MiniMax

Xiaomi

⸻

根据 API Key 自动识别用户。

根据用户配置自动路由模型。

⸻

示例：

员工A

默认模型：

DeepSeek V4

请求：

/api/llm/v1/chat/completions

自动转发：

DeepSeek

⸻

员工B

默认模型：

Kimi K2

自动转发：

Kimi

⸻

Prompt记录

必须记录：

用户Prompt

AI回复

模型

Token

耗时

时间

⸻

工作日报

每天凌晨自动生成

内容：

今日工作总结

完成任务

Prompt数量

Token数量

AI使用情况

⸻

Prompt质量分析

可配置评价模型。

例如：

业务模型：

DeepSeek V4

评价模型：

Kimi K2

⸻

评分项：

表达清晰度

上下文完整度

约束条件完整度

输出格式完整度

任务目标明确度

⸻

输出：

评分

优点

缺点

改进建议

⸻

安全要求

密码：

BCrypt

⸻

认证：

JWT

⸻

API Key：

SHA256存储

数据库不得保存明文API Key。

⸻

API规范

统一返回：

{
  "code": 0,
  "message": "success",
  "data": {}
}

错误：

{
  "code": 500,
  "message": "error",
  "data": null
}

⸻

前端目录结构

src/

api/

components/

layouts/

router/

stores/

views/

utils/

assets/

⸻

后端目录结构

src/

controllers/

services/

middleware/

routes/

models/

validators/

config/

gateway/

scheduler/

utils/

⸻

开发阶段

Phase 1

目标：

项目基础框架

内容：

* Vue3初始化
* Node.js + Express初始化
* Prisma + SQLite集成
* JWT登录
* 管理员初始化
* 登录页
* Dashboard页面框架
* Docker支持

验收标准：

项目启动成功

登录成功

JWT鉴权成功

⸻

Phase 2

目标：

员工管理

内容：

* 员工列表
* 新增员工
* 编辑员工
* 删除员工
* 禁用员工

验收标准：

完整CRUD

⸻

Phase 3

目标：

API Key管理

内容：

* 自动生成Key
* 重置Key
* 复制Key
* 禁用Key

格式：

sk_llm_xxxxxxxxxxxxxx

验收标准：

API Key可正常管理

⸻

Phase 4

目标：

模型管理

内容：

* DeepSeek
* Kimi
* MiniMax
* Xiaomi

配置管理

模型启停

评价模型设置

验收标准：

模型可配置

⸻

Phase 5

目标：

AI Gateway

内容：

OpenAI兼容接口

模型转发

Token统计

日志记录

验收标准：

Claude Code可直接调用

⸻

Phase 6

目标：

对话审计

内容：

会话列表

消息详情

Token统计

模型统计

验收标准：

完整查看会话

⸻

Phase 7

目标：

工作日报

内容：

日报生成

日报查看

日报统计

验收标准：

日报自动生成

⸻

Phase 8

目标：

Prompt评价系统

内容：

AI评分

优点分析

缺点分析

改进建议

验收标准：

评价结果可查看

⸻

Phase 9

目标：

Dashboard完善

内容：

员工活跃排行

模型使用统计

Prompt评分统计

日报统计

验收标准：

管理驾驶舱完成

⸻

Phase 10

目标：

系统发布版

内容：

Docker镜像

README

安装文档

初始化脚本

数据库迁移脚本

验收标准：

一键启动：

docker compose up -d

即可运行系统

这份文档已经足够支撑 Claude Code 连续开发数周，并且不会在中途出现架构漂移。建议每次只开放一个 Phase，Phase 验收通过后再进入下一阶段。这样生成的代码质量通常远高于“一次性生成整个项目”。