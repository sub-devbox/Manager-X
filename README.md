# Manager-X

**Manager-X** is an all-in-one business management and financial OS designed for freelancers, independent consultants, and boutique agencies. It unifies project management, time tracking, multi-currency invoicing, client billing profiles, tax assistance, and personal wealth tracking into a sleek, local-first dashboard.

---

## Features

### 📄 Invoices & Billing
- **Interactive Invoice Sheet**: Full tabular view with quick filtering, searching, status badges, and 50-interval pagination.
- **Record & Undo Payment**: Mark invoices as paid with foreign exchange received amount (`INR`) and payment date, with instant one-click **Undo Paid** rollback.
- **Pixel-Perfect PDF Generation**: Server-side PDF generation powered by ReportLab with custom agency branding, dynamic line items, payment gateway wire instructions, and official paid stamps.
- **Flexible Pricing**: Supports itemized billing, HSN/SAC codes, fixed or percentage-based discounts, and round-off adjustments.

### 👥 Client Management
- **Client Workspace**: Track clients, contact persons, tax IDs, addresses, and payment terms (Net 15, Net 30, etc.).
- **Dynamic Currency & Country Defaults**: Seamlessly pull workspace currency and country settings without hardcoded limitations.
- **Revenue Overview**: Live calculated totals showing both incoming foreign currency billing and equivalent INR received per client.

### ⏱️ Projects & Time Tracking
- **Projects & Tasks**: Organize tasks with billable hourly rates, estimated hours, and interactive checklists.
- **Integrated Time Tracker**: Log billable hours with stopwatch timers or manual entries.
- **Unbilled Task Sync**: Pull tracked billable hours directly into invoice line items without manual recalculations.

### 🖥️ Windows Desktop Application (Time Tracker)
- **Standalone 64-Bit Desktop Client**: Built with C# and WPF (`net8.0-windows`), running as a single-file self-contained `.exe` with zero runtime dependencies.
- **Backend Auto-Launcher & Health Check**: Automatically verifies FastAPI backend availability on startup. If offline, provides an interactive UI to auto-detect `backend\venv\Scripts\python.exe`, select ports, and spawn the server in a separate terminal with live readiness polling.
- **Compact Floating Mini-Widget**: Automatically shrinks into a sleek, draggable floating widget with 80% opacity when timing, keeping active tasks and stopwatch digits accessible without cluttering your workspace.
- **Accidental Close Protection**: Minimizes to the Windows system tray on `✕`, `Alt+F4`, or taskbar close while a timer is running, preventing accidental tracking loss.
- **OS Shutdown & Restart Protection**: Leverages native Win32 `ShutdownBlockReasonCreate` and `WM_QUERYENDSESSION` hooks so Windows warns and prevents unexpected system shutdown during active time tracking.
- **Hardware-Tied Credential Security**: Encrypts stored session tokens locally using Windows Data Protection API (`DPAPI`), ensuring secure silent auto-login.

### 💳 Payment Gateways & Banking
- **Gateway Directory**: Manage multiple payment gateways (Razorpay, Stripe, PayPal, SWIFT wire transfers, custom bank accounts).
- **Auto Instructions**: Automatically embed selected gateway payment instructions directly into generated invoices and downloadable PDFs.

### 📊 Finance, Wealth & Tax (ITR) Helper
- **Financial Analytics**: High-level visual dashboards of billable volume, received revenue, and pending balances.
- **Wealth & Asset Allocation**: Track personal assets, liquid cash reserves, and investments in one place.
- **ITR Helper**: Prepare consulting revenue and deductible expenses for annual Income Tax Return filing.

### 🛡️ Enterprise-Grade Security
- **Modern Auth**: Argon2 password hashing and PyJWT tokens stored in secure, HttpOnly cookies.
- **Hardened Middleware**: Built-in rate limiting (`slowapi`), CORS restrictions, and strict security headers (`X-Frame-Options`, `X-Content-Type-Options`, `CSP`).
- **Local-First SQLite**: Asynchronous SQLite (`aiosqlite`) keeps your sensitive financial data private and on your machine.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Web Frontend** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack), [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/), [TanStack Query](https://tanstack.com/query), [Lucide React](https://lucide.dev/), Custom Vanilla CSS Design System |
| **Desktop App** | [C# .NET 8.0](https://dotnet.microsoft.com/), [WPF](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/), Windows DPAPI, Win32 P/Invoke (`user32.dll`), Single-File Self-Contained (`win-x64`) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [Python](https://www.python.org/) 3.10+, [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 (Async), [aiosqlite](https://github.com/omnilib/aiosqlite), [Pydantic](https://docs.pydantic.dev/) v2, [ReportLab](https://www.reportlab.com/) |
| **Security & Auth** | Argon2-cffi, Passlib, PyJWT (HS256), Windows DPAPI, SlowAPI (Rate Limiting) |
| **Testing** | [Pytest](https://docs.pytest.org/) (AsyncIO), Next.js Build Typechecking, .NET Release Compilation |

---

## Project Structure

```text
Manager-X/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # FastAPI REST route handlers
│   │   ├── core/              # Config, database session, security & JWT
│   │   ├── models/            # SQLAlchemy database entities
│   │   ├── schemas/           # Pydantic validation schemas
│   │   └── services/          # ReportLab PDF generator & business logic
│   ├── tests/                 # Comprehensive pytest test suite
│   ├── requirements.txt       # Python dependencies
│   └── venv/                  # Local virtual environment (ignored)
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages (invoices, clients, etc.)
│   │   ├── components/        # Reusable modules, sheets, modals, & layout
│   │   ├── hooks/             # Custom React hooks (resizable columns, etc.)
│   │   ├── lib/               # Typed API client & React Query configuration
│   │   └── types/             # Shared TypeScript data models
│   ├── package.json           # Frontend dependencies & scripts
│   └── next.config.ts         # Next.js configuration & API rewrites
├── desktop/
│   ├── ManagerX.Desktop/      # C# WPF Desktop source project
│   │   ├── Views/             # LoginView, TrackerView, BackendSetupView
│   │   ├── Services/          # BackendLauncher, ShutdownPrevention, ApiClient, Storage
│   │   └── Models/            # Desktop DTOs & DPAPI credentials models
│   └── publish/               # Standalone 64-bit single-file ManagerX.exe (ignored)
├── docker-compose.yml         # Containerized production stack with health checks
├── DEPLOYMENT_LINUX.md        # Guide for deploying with Docker on Linux servers
├── DATABASE_RELATIONS.md      # Database schema, ER diagrams & foreign key cascade map
├── start.bat                  # One-click start for backend + frontend services
├── stop.bat                   # Cleanly terminate running processes
├── manager.bat                # Interactive console control menu
├── .env.example               # Template environment variables
├── .gitignore                 # Safe git ignore rules for secrets and build artifacts
└── README.md                  # Project documentation
```

---

## Getting Started

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12+
- **Node.js**: 18.x or 20.x+
- **Git**

---

### 1. Environment Setup

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Edit `.env` to define your secret key:

```env
SECRET_KEY=your-secure-random-secret-key-here
PROJECT_NAME="Manager X"
```

---

### 2. Backend Setup

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The backend will automatically initialize the database schema in `data/manager_x.db`.*
   *Interactive API docs are available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

---

### 3. Frontend Setup

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser. Next.js automatically rewrites API calls (`/api/*`) to the backend running at `http://127.0.0.1:8000`.

---

### 🐳 Running with Docker (Containerized Setup)

Manager-X is fully Docker-ready with a multi-stage production Next.js frontend, an optimized FastAPI backend with health checks, and persistent SQLite database mapping.

#### One-Click Launch (Docker Compose)

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is running, then run:

```bash
docker compose up -d --build
```

Or on Windows, double-click **`docker-start.bat`** (or use option `4` in **`manager.bat`**).

#### Services:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

#### Persistent Storage:
- Your SQLite database and automatic backups are mounted from `./data` directly to `/app/data` inside the container.
- Existing data in `data/manager_x.db` and `data/backups/` persists across container restarts, teardowns, and rebuilds.

#### Stopping Containers:
```bash
docker compose down
```
Or double-click **`docker-stop.bat`** (or option `5` in **`manager.bat`**).

#### Local Linux Server Deployment:
For a detailed step-by-step guide to deploying on an Ubuntu, Debian, or Raspberry Pi home server with custom ports, firewall rules, and Nginx reverse proxy configuration, see [DEPLOYMENT_LINUX.md](DEPLOYMENT_LINUX.md).

---

### 4. Windows Desktop App (Time Tracker)

Manager-X includes a standalone Windows 64-bit desktop client for native time tracking with floating mini-widget mode, system tray integration, and offline backend auto-launching.

#### Running the App:
- If you have compiled the desktop executable, launch:
  ```powershell
  .\desktop\publish\ManagerX.exe
  ```
- **Backend Detection**: If the FastAPI backend is not running, the application will display the **Backend Setup & Launcher** screen, auto-detect your `backend\venv\Scripts\python.exe`, and launch the backend in a separate terminal with live readiness polling.
- **Accidental Close Prevention**: Closing the window (`✕`, `Alt+F4`, or taskbar close) while a timer is active minimizes the app to the Windows notification tray, ensuring no tracked hours are lost.
- **Windows Shutdown Prevention**: If Windows begins an OS restart or update while tracking, native Windows blocker notifications warn you to stop and save your timer first.

#### Building & Publishing from Source:
To compile and package the standalone, self-contained 64-bit `.exe` (requires .NET 8.0 SDK):
```powershell
dotnet publish desktop/ManagerX.Desktop/ManagerX.Desktop.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o desktop/publish
```

#### Distributing to Non-Developers:
The resulting `desktop/publish/ManagerX.exe` is **fully self-contained** (~72 MB), containing the embedded .NET runtime and native libraries. To distribute:
1. Upload `ManagerX.exe` directly to **GitHub Releases** on your repository.
2. End users can download and double-click to run immediately without needing Git, Python, or the .NET SDK installed.

---

### 5. Control Scripts (Batch)
For quick workflow management on Windows:
- **`start.bat`**: Launches both Backend (port 8000) and Frontend (port 3000) in separate console windows.
- **`stop.bat`**: Stops running servers on ports 8000 and 3000.
- **`manager.bat`**: Interactive console menu to Start, Stop, or Restart services.

---

## Running Tests

### Backend Tests
From the root directory:
```bash
# Windows (PowerShell)
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\pytest.exe

# macOS / Linux
PYTHONPATH=backend pytest
```

### Frontend Build & Typecheck
From `frontend/`:
```bash
npm run build
```

---

## Contributing & Development Guidelines
- **Local-First Safety**: Never commit `.env` or SQLite `.db` database files.
- **Atomic Commits**: Stage and test changes before committing.
- **Linting & Types**: Ensure `npm run build` and `pytest` pass cleanly before submitting pull requests.

---

## License
MIT License. Created for independent professionals and creators.
