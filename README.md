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
| **Frontend** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack), [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/), [TanStack Query](https://tanstack.com/query), [Lucide React](https://lucide.dev/), Custom Vanilla CSS Design System |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [Python](https://www.python.org/) 3.10+, [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 (Async), [aiosqlite](https://github.com/omnilib/aiosqlite), [Pydantic](https://docs.pydantic.dev/) v2, [ReportLab](https://www.reportlab.com/) |
| **Security & Auth** | Argon2-cffi, Passlib, PyJWT (HS256), SlowAPI (Rate Limiting) |
| **Testing** | [Pytest](https://docs.pytest.org/) (AsyncIO), Next.js Build Typechecking |

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
