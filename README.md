# AI Media Teaching Hub | 传媒AI教研智能中枢

> 传媒课程智能教研与学情分析平台模板

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Nginx + SSL                              │
├────────────────────────────┬────────────────────────────────┤
│     Frontend (:3000)       │       Backend (:8000)           │
│     Next.js 15             │       FastAPI                   │
│     - Login (JWT)          │       - /api/auth (JWT)         │
│     - Teacher Dashboard    │       - /api/chat (LLM stream)  │
│     - Student Portal       │       - /api/rag (retrieval)    │
│     - shadcn/ui + Recharts │       - /api/insight (diagnosis)│
├────────────────────────────┴────────────────────────────────┤
│                        Data Layer                            │
│  ChromaDB (RAG vectors)  │  SQLite  │  CSV/JSON (scores)    │
├─────────────────────────────────────────────────────────────┤
│                     LLM Backends                             │
│   DeepSeek (教师端)  │  MiniMax ×5 keys (学生端)              │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 前置要求
- Docker & Docker Compose
- 或: Node.js 20+ & Python 3.11+

### 一键启动 (Docker)

```bash
# 1. 复制环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入真实 API Key

# 2. 启动
docker compose up --build
```

访问:
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000/docs

### 本地开发 (不用 Docker)

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env   # 编辑填入 API Key
uvicorn app.main:app --reload --port 8000

# Frontend (新终端)
cd frontend
npm install
npm run dev
```

## 默认账号

| 角色 | 凭证 | 说明 |
|------|------|------|
| 教师 | 密码: `changeme` | 完整权限 |
| 学生 | 访问码: `stu2026` | 学生功能 |

> ⚠️ 生产部署前请修改 `backend/.env` 中的密码和 JWT 密钥

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15, TypeScript, Tailwind CSS |
| 后端 | FastAPI, Python 3.11 |
| LLM | DeepSeek (教师端) + MiniMax (学生端, 5-key round-robin) |
| RAG | LangChain + ChromaDB |
| 部署 | Docker Compose, Nginx, Let's Encrypt |

## 项目结构

```
ai_dashboard/
├── backend/           # FastAPI 后端
│   ├── app/           # 应用代码
│   │   ├── main.py    # 入口
│   │   ├── config.py  # 配置
│   │   └── auth.py    # 认证
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # Next.js 前端
│   ├── src/app/       # 页面路由
│   │   ├── page.tsx   # 登录页
│   │   ├── teacher/   # 教师端
│   │   └── student/   # 学生端
│   └── Dockerfile
├── data/              # 数据目录 (需自行准备)
├── docker-compose.yml
└── docs/              # 部署文档
```

## License

MIT
