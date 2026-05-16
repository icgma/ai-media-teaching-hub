# Production Deployment Guide

This guide covers how to deploy the AI Dashboard to a Linux VPS (Ubuntu 22.04+ recommended).

## Prerequisites

1.  **Docker & Docker Compose**: Installed on the server.
2.  **Nginx**: Installed and running (or use the included Docker Nginx).
3.  **Domain Name**: Pointed to your server IP (optional, for SSL).

## Step-by-Step Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/icgma/ai-media-teaching-hub.git
cd ai-media-teaching-hub
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory based on `.env.example`.
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your production API keys and settings
```

Required settings:
- `TEACHER_API_KEY` — Teacher-facing LLM API key
- `MINIMAX_API_KEY_1` ~ `5` — Student-facing MiniMax API keys
- `TEACHER_PASSWORD` / `STUDENT_ACCESS_CODE` — Login credentials
- `JWT_SECRET` — Change to a random string
- `CORS_ORIGINS` — Your actual domain or IP

### 3. Run the Deployment Script
Make the script executable and run it:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Enable SSL (Recommended)
Use Certbot to enable HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Maintenance

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Update the Application
Simply run the deployment script again:
```bash
./deploy.sh
```

## Architecture Notes
-   **Frontend**: Next.js running on port 3000 inside Docker.
-   **Backend**: FastAPI running on port 8000 inside Docker.
-   **Nginx**: Acts as a reverse proxy, handling SSL termination and routing `/api` and `/static` requests to the backend.
-   **Data Persistence**: Docker volumes persist data in `data/`.
