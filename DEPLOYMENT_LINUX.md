# 🐧 Deploying Manager-X with Docker on a Local Linux Server

This guide walks you through deploying **Manager-X** on any local Linux server (Ubuntu, Debian, Rocky Linux, Fedora, Raspberry Pi OS, etc.) using Docker and Docker Compose.

---

## 🏗️ Architecture Overview

When deployed via Docker Compose:
- **`manager-x-frontend`**: Next.js 16 container running in optimized standalone production mode.
- **`manager-x-backend`**: FastAPI container running on Python 3.11 with SQLite in WAL mode.
- **`./data` Volume**: Mounted directly from your host filesystem to `/app/data`. Your database (`manager_x.db`) and backups are completely persistent and live on your Linux host.
- **Internal Network**: Frontend proxies `/api/*` requests to `http://backend:8000` via Docker's internal DNS network.

---

## 📋 Prerequisites

Ensure Docker and the Docker Compose plugin are installed on your Linux machine.

### Installing Docker (Ubuntu / Debian / Raspberry Pi OS):
```bash
# 1. Install Docker using the official automated script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Allow your non-root user to run Docker commands
sudo usermod -aG docker $USER

# 3. Apply group membership (or log out and back in)
newgrp docker

# 4. Verify installation
docker --version
docker compose version
```

---

## 🚀 Step-by-Step Deployment

### 1. Clone the Repository

Clone Manager-X to your preferred directory (e.g. `/opt/manager-x` or `~/manager-x`):

```bash
git clone <your-repository-url> ~/manager-x
cd ~/manager-x
```

---

### 2. Configure Environment Variables (`.env`)

Copy the template environment file:

```bash
cp .env.example .env
```

Open `.env` in your text editor:

```bash
nano .env
```

#### Key Settings to Configure:

1. **`SECRET_KEY`**: Generate a cryptographically secure 32-byte secret key:
   ```bash
   openssl rand -hex 32
   ```
   Paste the generated string into `SECRET_KEY=...`.

2. **Custom Ports** *(Optional)*:
   If port `3000` or `8000` is already in use by another service on your server, change them:
   ```env
   FRONTEND_PORT=3005
   BACKEND_PORT=8005
   ```

3. **`CORS_ORIGINS`**:
   Add your Linux server's LAN IP address or local hostname so browser requests are permitted:
   ```env
   # Replace 192.168.1.50 with your server's actual local IP address
   CORS_ORIGINS=http://localhost:3000,http://192.168.1.50:3000,http://192.168.1.50:8000
   ```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

### 3. Ensure File Permissions for SQLite

SQLite writes database journals (`-wal` and `-shm` files) alongside the database. Ensure the `./data` directory exists with proper permissions:

```bash
mkdir -p data/backups
chmod -R 775 data
```

---

### 4. Build and Launch Containers

Run Docker Compose in detached mode:

```bash
docker compose up -d --build
```

Docker will:
1. Build the lightweight Next.js standalone container.
2. Build the FastAPI Python container.
3. Automatically perform health checks to verify services are healthy and responding.

---

### 5. Verify Container Status & Logs

Check that both containers are running and healthy:

```bash
docker compose ps
```

*Expected output:*
```text
NAME                 IMAGE                  COMMAND                  SERVICE    STATUS
manager-x-backend    manager-x-backend      "uvicorn app.main:ap…"   backend    Up (healthy)
manager-x-frontend   manager-x-frontend     "node server.js"         frontend   Up (healthy)
```

To follow live logs:
```bash
docker compose logs -f
```

---

### 6. Configure Linux Firewall

If your server has an active firewall, open the required ports:

#### Using UFW (Ubuntu / Debian):
```bash
sudo ufw allow 3000/tcp comment "Manager-X Web UI"
sudo ufw allow 8000/tcp comment "Manager-X API"
sudo ufw reload
```

#### Using Firewalld (RHEL / Rocky / CentOS):
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

---

## 🌐 Accessing Manager-X

From any device on your local network (laptop, tablet, phone):

- **Web Dashboard**: `http://<server-ip>:3000` *(e.g. `http://192.168.1.50:3000`)*
- **API Documentation**: `http://<server-ip>:8000/docs`
- **Health Endpoint**: `http://<server-ip>:8000/health`

---

## 🔀 Port Flexibility: How to Change Ports

### Can ports be customized?
**Yes! Ports are 100% configurable.**

Docker maps host ports to internal container ports: `HOST_PORT:CONTAINER_PORT`.

To change either port:
1. Edit `.env`:
   ```env
   FRONTEND_PORT=4000
   BACKEND_PORT=9000
   CORS_ORIGINS=http://localhost:4000,http://192.168.1.50:4000
   ```
2. Re-apply the changes:
   ```bash
   docker compose up -d
   ```
3. Your web dashboard is now accessible at `http://<server-ip>:4000` and the API at `http://<server-ip>:9000`.
   *(Inside the Docker network, internal communication remains uninterrupted).*

---

## 🛡️ Optional: Nginx Reverse Proxy with Port 80 / Domain

If you want to access Manager-X on port `80` (e.g. `http://managerx.local` or `http://192.168.1.50`) without typing `:3000`:

1. Install Nginx:
   ```bash
   sudo apt install nginx -y
   ```

2. Create `/etc/nginx/sites-available/manager-x`:
   ```nginx
   server {
       listen 80;
       server_name 192.168.1.50 managerx.local;

       client_max_body_size 50M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/manager-x /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 🔄 Maintenance & Upgrades

### Updating to the Latest Version:
```bash
cd ~/manager-x
git pull
docker compose up -d --build
```
*(Your database in `./data/manager_x.db` is untouched and stays intact during builds).*

### Restarting Containers:
```bash
docker compose restart
```

### Stopping Containers:
```bash
docker compose down
```

---

## 💾 Backups & Disaster Recovery

- **Database Location**: `~/manager-x/data/manager_x.db`
- **In-App Automated Backups**: `~/manager-x/data/backups/`

### Creating an Automated Daily Backup (Cron):
Run `crontab -e` and add:
```cron
# Daily backup at 2:00 AM to a dedicated backups folder
0 2 * * * cp /opt/manager-x/data/manager_x.db /opt/backups/manager_x_$(date +\%Y\%m\%d).db
```

To restore a backup, place the desired `.db` file into `data/manager_x.db` and run `docker compose restart backend`.
