# AQUORA AI — Production Deployment & Hosting Guide

This guide provides instructions for deploying and hosting **AQUORA AI** in production environments.

---

## 1. System Architecture & Prerequisites

### Architecture Overview
- **Frontend Container**: Node 22 build → Nginx Alpine reverse proxy serving optimized SPA static bundles on port `80` (or `443` with TLS). Proxies `/api/v1/` to the backend service.
- **Backend Container**: Multi-stage Python 3.11-slim FastAPI server running on port `8000` via Uvicorn. Non-root user `aquora` (UID 10001).
- **Persistence**: Named Docker volume `aquora-sqlite-storage` mounted at `/app/data/` preserving `aquora.db` across container updates.

### Recommended System Specifications
- **CPU**: 2 vCPU cores minimum (4 vCPU recommended for high concurrency)
- **RAM**: 2 GB minimum (4 GB recommended)
- **Disk**: 15 GB SSD storage
- **Operating System**: Ubuntu 22.04 LTS / Debian 12 / Rocky Linux 9 / Alpine Linux
- **Software**: Docker Engine 24.0+ & Docker Compose v2.20+

---

## 2. Docker Compose Deployment (Recommended)

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/your-org/Aquora_AI.git
cd Aquora_AI

# Create production environment file from template
cp .env.production.example .env.production
```

Edit `.env.production` and generate a cryptographically secure secret key:
```bash
# Generate a 64-character secret key
openssl rand -hex 32
```
Paste this value into `SECRET_KEY` in `.env.production`.

Configure your alert channels:
- Set `ALERT_TEST_MODE="false"` for live deliveries.
- Set `ALERT_WEBHOOK_URL` for Discord / Slack / Incident webhooks.
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` for email delivery.
- Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` for SMS alerts.

### Step 2: Build & Start Containers
```bash
# Build images and start services in detached mode
docker compose --env-file .env.production up -d --build
```

### Step 3: Verify Container Health
```bash
docker compose ps
```
Both `aquora-backend` and `aquora-frontend` should report status `Up (healthy)`.

Inspect backend logs:
```bash
docker compose logs -f backend
```

Verify the health check endpoint:
```bash
curl -f http://localhost:8000/api/v1/health
```
Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "ml_model_loaded": true
}
```

### Step 4: Run Database Migrations & Initial Data Seeding
Run Alembic migrations inside the running container:
```bash
docker compose exec backend alembic upgrade head
```

Seed initial monitored water bodies, vector geometries, and default role accounts:
```bash
docker compose exec backend python app/db/init_db.py
```

---

## 3. Pre-Configured Operational Personnel Accounts

The initial seeding creates 4 standard personnel accounts across the role hierarchy:

| Role | Username | Email | Default Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `admin@aquora.gov.in` | `Admin@Aquora2026!` | User management, dataset import/export, system diagnostics, alert dispatch |
| **OFFICER** | `officer` | `officer@ksdma.kerala.gov.in` | `Officer@Ksdma2026!` | Emergency alert dispatch, inspection scheduling, what-if simulations |
| **INSPECTOR** | `inspector` | `inspector@kwa.kerala.gov.in` | `Inspector@Kwa2026!` | Site safety audits, field checklist verification, structural risk logs |
| **VIEWER** | `viewer` | `viewer@aquora.local` | `Viewer@Aquora2026!` | Public safety dashboard view, river forecasts, GIS map exploration |

> [!WARNING]
> Immediately rotate default passwords in production using `POST /api/v1/auth/change-password` or through the administrative portal.

---

## 4. Reverse Proxy & HTTPS / SSL Configuration

For public internet deployment with Let's Encrypt SSL, configure host Nginx:

```nginx
# /etc/nginx/sites-available/aquora.kerala.gov.in
server {
    server_name aquora.kerala.gov.in;

    location / {
        proxy_pass http://127.0.0.1:80; # Points to frontend container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Install SSL certificate using Certbot:
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aquora.kerala.gov.in
```

---

## 5. Automated Backup & Disaster Recovery Schedule

The SQLite database file is stored in `/app/data/aquora.db`.

To configure an automated nightly backup cron job on the host machine:

```bash
# Add to crontab via: sudo crontab -e
0 2 * * * docker compose -f /path/to/Aquora_AI/docker-compose.yml exec -T backend python -c "from app.services.data_management_service import data_management_service; open('/app/data/backup_latest.db', 'wb').write(data_management_service.get_database_backup_bytes())" && cp /var/lib/docker/volumes/aquora-sqlite-storage/_data/backup_latest.db /backups/aquora_$(date +\%Y\%m\%d).db
```

### Manual Backup Download via API
Administrators can generate an atomic binary database snapshot at any time:
```bash
curl -X GET "http://localhost:8000/api/v1/data/backup" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -o aquora_backup_$(date +%Y%m%d).db
```

---

## 6. Bare-Metal Systemd Deployment (Alternative to Docker)

If hosting directly on an Ubuntu/Debian server without Docker:

### 1. Backend Service Unit
Create `/etc/systemd/system/aquora-backend.service`:
```ini
[Unit]
Description=AQUORA AI FastAPI Backend Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/aquora/backend
Environment="PATH=/var/www/aquora/backend/.venv/bin"
EnvironmentFile=/var/www/aquora/.env.production
ExecStart=/var/www/aquora/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable aquora-backend
sudo systemctl start aquora-backend
```

### 2. Frontend Build Deployment
```bash
cd /var/www/aquora/frontend
npm ci
npm run build
sudo cp -r dist/* /var/www/html/aquora/
```

---

## 7. Troubleshooting & Verification Commands

| Action | Command |
| :--- | :--- |
| View Backend Logs | `docker compose logs -f --tail=100 backend` |
| View Frontend Logs | `docker compose logs -f --tail=100 frontend` |
| Verify Telemetry Providers | `curl http://localhost:8000/api/v1/telemetry/providers/status` |
| Validate Alert Channels | `curl -X POST http://localhost:8000/api/v1/alerts/validate-channels` |
| Query System Diagnostics | `curl http://localhost:8000/api/v1/admin/diagnostics` |
| Restart Backend Container | `docker compose restart backend` |
| Execute Pytest In Container | `docker compose exec backend pytest backend/tests` |

