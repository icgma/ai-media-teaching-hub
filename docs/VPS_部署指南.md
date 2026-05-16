# VPS 一键部署指南 — AI-驱动传媒制作 智能中枢

> 请先 fork 本仓库到自己的 GitHub 账号后操作。

## 前提条件

| 项目 | 要求 |
|------|------|
| VPS 系统 | Ubuntu 22.04+ / Debian 11+ |
| 最低配置 | 2 核 CPU, 4GB RAM, 40GB 磁盘 |
| 推荐配置 | 4 核 CPU, 8GB RAM, 60GB 磁盘 |
| 网络 | 开放 8505 端口（或自定义端口） |

---

## 第一步：VPS 基础环境（SSH 登录后执行）

```bash
# 安装基础工具
sudo apt-get update -qq && sudo apt-get install -y git curl

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose 插件
sudo apt-get install -y docker-compose-plugin

# ⚠️ 重要：执行到这里后，退出 SSH 重新登录，使 docker 组权限生效
```

重新 SSH 登录后，验证：
```bash
docker --version          # 应显示 Docker 版本
docker compose version    # 应显示 Compose 版本
```

> **⚠️ 注意**：本项目**不需要**在 VPS 主机上安装 Nginx。Nginx 已作为 Docker 容器集成在 `docker-compose.prod.yml` 中。

---

## 第二步：克隆代码

```bash
git clone https://github.com/<your-username>/ai-media-teaching-hub.git
cd ai-media-teaching-hub
```

---

## 第三步：配置环境变量

```bash
# 复制后端环境变量模板
cp backend/.env.example backend/.env

# 编辑环境变量文件
nano backend/.env
```

请确保在 `.env` 中正确填写：
- `TEACHER_API_KEY` — 教师端大模型 API Key
- `MINIMAX_API_KEY_1` ~ `5` — 学生端 MiniMax API Key
- `TEACHER_PASSWORD` / `STUDENT_ACCESS_CODE` — 登录凭据
- `JWT_SECRET` — 改为随机字符串
- `CORS_ORIGINS` — 改为你的实际访问地址

---

## 第四步：一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

等待约 3-5 分钟（首次构建 Docker 镜像），成功后显示部署完成信息。

---

## 架构总览

```
┌──────────────────────────────────────────────────┐
│                   VPS (Ubuntu)                    │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │            Docker Compose Network           │  │
│  │                                             │  │
│  │  ┌─────────┐  ┌────────────┐  ┌─────────┐  │  │
│  │  │  Nginx  │──│  Frontend  │  │ Backend │  │  │
│  │  │  :80    │  │  Next.js   │  │ FastAPI │  │  │
│  │  │(alpine) │──│  :3100     │  │ :8000   │  │  │
│  │  └────┬────┘  └────────────┘  └────┬────┘  │  │
│  │       │                            │       │  │
│  │       │        ┌─────────┐         │       │  │
│  │       │        │  data/  │◀────────┘       │  │
│  │       │        │ (volume)│  持久化挂载     │  │
│  │       │        └─────────┘                 │  │
│  └───────┼────────────────────────────────────┘  │
│          │                                        │
│     外部端口映射: 8505 → Nginx:80                  │
└──────────┼───────────────────────────────────────┘
           │
      用户浏览器访问
```

**流量路径**：`用户 → :8505 → Nginx → / 转发 Frontend:3100 | /api 转发 Backend:8000`

---

## 后续更新（一键）

每次在本地修改代码后，推送到 GitHub，然后在 VPS 上：

```bash
cd ~/ai-media-teaching-hub && ./deploy.sh
```

脚本会自动 pull → build → restart → health check。

---

## 常用运维命令

```bash
# 查看容器日志
docker compose -f docker-compose.prod.yml logs -f --tail=50

# 仅查看后端日志
docker compose -f docker-compose.prod.yml logs -f backend

# 重启容器（不重新构建）
docker compose -f docker-compose.prod.yml restart

# 停止服务
docker compose -f docker-compose.prod.yml down

# 查看容器状态
docker compose -f docker-compose.prod.yml ps
```

---

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 健康检查失败 | `docker compose -f docker-compose.prod.yml logs --tail=50` |
| 端口被占用 | `sudo lsof -i :8505` 找到占用进程并 kill |
| API 不工作 | 检查 `backend/.env` 中的 API Key |
| Docker 权限不足 | 重新登录 SSH 或 `sudo usermod -aG docker $USER` |
| 前端构建失败 | `docker compose -f docker-compose.prod.yml logs frontend` 查看具体错误 |
