# Manager X — Project Memory & State Ledger

**Last Updated:** Phase 1 Initialization  
**Project Name:** Manager X  
**Project Root:** `d:/Coding/AI-Coding/Antigravity/Manager-X`  

---

## 1. Project Overview & Identity
Manager X is an integrated, local-first enterprise and life resource planning application built for independent professionals, consultants, and founders.

It combines 7 pillars into a cohesive platform:
1. **Project Manager**: Clients, milestones, deliverables, nested tasks.
2. **Time Tracker**: Real-time billable tracking, project-linked logs, unbilled hour sync.
3. **Invoice Generator**: Multi-currency, GST/tax-compliant PDF generation, payment recording.
4. **Finance Manager**: Double-entry/multi-account cashflow, expense categories, P&L.
5. **Asset Manager**: Fixed & intangible assets, automated SLM & WDV depreciation.
6. **ITR Helper**: Indian Income Tax return planning, Old vs New Regime simulation, 44ADA presumptive calculation, deduction registers.
7. **Wealth Manager**: Net worth tracker, multi-asset class allocation, rebalancing engine.

---

## 2. Architectural Invariants & Rules

1. **Zero Hardcoding**:
   - Currencies, tax schemes, tax slabs, category hierarchies, depreciation rates, and invoice number templates must NEVER be hardcoded into Python or TypeScript code.
   - All logic relies on lookup tables or `/api/v1/settings/*` configuration entities.
2. **Minimal & Clean UI**:
   - Modern, typography-driven, distraction-free aesthetic.
   - Design tokens for dark/light themes defined via CSS variables.
   - Numbers and financial figures must use monospace fonts (e.g., JetBrains Mono).
3. **Local-First & Safe**:
   - Single-file SQLite database with Write-Ahead Logging (`WAL`).
   - Automated timestamped database backups on boot.
   - Complete export/import capability in JSON.
4. **Clean Decoupled Stack**:
   - **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0 Async, Pydantic v2.
   - **Frontend**: Next.js (App Router, TypeScript), Vanilla CSS / CSS Modules with Design Tokens, Lucide Icons, Recharts.
5. **CUID Identifier Standard**:
   - All entity primary keys, public references, and ID inputs across all models must use **CUID** (Collision-resistant Unique Identifier generated via `app.core.cuid.generate_cuid`).
6. **Referential Deletion Protection (Cannot Delete if Already Used)**:
   - Any master data, lookup item, or configuration entity (Currencies, Clients, Tax Schemes, Accounts, Categories, Projects, Tasks) **CANNOT be deleted if it is already referenced or used** by any other entity or transaction. Deletion attempts on in-use entities must be rejected with an explicit error. Entities should be marked inactive (`is_active = false`) instead of deleted.
7. **Currencies & Dynamic FX**:
   - Currency definitions only store metadata (`code`, `symbol`, `name`, `is_base_currency`, `is_active`). Fixed "Exchange Rate to Base" is completely removed from currency models and settings, as FX rates are dynamic and determined at invoice/transaction execution time.
8. **Automatic Git Version Control**:
   - Automatically stage (`git add .`) and git-commit every single atomic change in code upon verification. Never leave uncommitted code changes.
9. **Modal Backdrop Dismissal Protection (Form & Data Safety)**:
   - Creation and editing modals (`ClientModal`, `SettingsModal`, project modals, invoice forms) must NEVER dismiss on outside backdrop clicks. Form state and unsaved input must be protected against accidental dismissal. Dismissal must strictly require explicit interaction (pinned close button, cancel button, or save).

---

## 3. Phase Roadmap & Execution Progress

- [x] **Phase 1: Foundational Specifications & Architecture**
  - [x] `product.md`: Product vision, target personas, ecosystem breakdown.
  - [x] `prd.md`: Exhaustive functional/non-functional requirements, acceptance criteria, zero-hardcoding spec.
  - [x] `architecture.md`: System topology, database schema (ERD), REST/WebSocket APIs, directory layout.
  - [x] `memory.md`: Project state ledger, architectural invariants, roadmap tracking.

- [/] **Phase 2: Backend Core Infrastructure & Security Authentication**
  - [x] Initialize Python virtual environment & install dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `aiosqlite`, `pydantic`, `argon2-cffi`, `pyjwt`, `email-validator`).
  - [x] Configure database engine (`sqlite+aiosqlite`), WAL mode, foreign key PRAGMA, session dependency.
  - [x] Senior software engineer security implementation:
    - [x] Argon2id password hashing ($m=65536, t=3, p=4$) + timing-attack dummy verify mitigation.
    - [x] Cryptographic JWT with `jti` unique session identifier tracked in SQLite for instant revocation.
    - [x] Brute-force rate limiter: 5 failed attempts locks account for 15 minutes.
    - [x] HttpOnly, SameSite, Secure cookie credentials + Bearer token support.
    - [x] Security headers middleware (`nosniff`, `DENY`, `mode=block`, `Permissions-Policy`).
    - [x] 100% passing automated test suite (`backend/tests/test_auth_security.py` & `backend/tests/test_auth_api.py`).
  - [x] Next.js frontend scaffold & minimalist login screen:
    - [x] Tokenized design system (`globals.css`) with light/dark theme toggle.
    - [x] Real-time password complexity & entropy meter.
    - [x] CapsLock indicator to prevent accidental lockouts.
    - [x] Brute-force lockout countdown timer.
    - [x] Dynamic admin onboarding bootstrap vs. sign-in state machine.

- [x] **Phase 3: Frontend Foundation & Design System**
  - [x] Scaffold Next.js project with TypeScript.
  - [x] Implement design token system in `globals.css` (minimal clean dark/light themes, typography, elevation, layout tokens).
  - [x] Build shared shell: Responsive `Sidebar`, sticky `Header`, `AppShell`, and persistent `GlobalTimerBar` component.
  - [x] Setup API client (`src/lib/api-client.ts`) and React Query configuration (`QueryProvider` & `query-client.ts`).
  - [x] Modular App Router stubs (`/projects`, `/time-tracker`, `/invoices`, `/finance`, `/assets`, `/itr-helper`, `/wealth`).
  - [x] 100% passing production build (`next build` / TypeScript verification).

- [/] **Phase 4: Operational Module Implementation (PM, TT, Invoices)**
  - [x] Client Management Module:
    - [x] Database model (`Client`) with CUID primary key (`cli_`), full structured address (Line 1, Line 2, City, State, Postal code, Country), commercial terms (Hourly Rate, Currency FK, Payment Terms Days, Active Status).
    - [x] Zero-hardcoding currency validation against database `currencies` table and dynamic countries registry (`/api/v1/settings/countries`).
    - [x] Pydantic schemas (`ClientCreate`, `ClientUpdate`, `ClientResponse`, `ClientSummary`).
    - [x] REST API endpoints (`GET /clients`, `POST /clients`, `GET /clients/{id}`, `PUT /clients/{id}`, `PATCH /clients/{id}/toggle-status`, `DELETE /clients/{id}` with referential deletion protection).
    - [x] 100% passing automated test suite (`backend/tests/test_clients_api.py` & `backend/tests/test_settings_api.py`).
    - [x] Frontend Client Directory (`/clients`), search & status filters, and ClientModal with dynamic combobox/datalist for country selection without hardcoding.
  - [x] Project & Task Management (Tabular & Nested):
    - [x] Database models (`Project` with CUID `prj_`, `Task` with CUID `tsk_`) with foreign keys and cascade protections.
    - [x] Pydantic schemas (`ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `TaskCreate`, `TaskUpdate`, `TaskStatusUpdate`, `TaskResponse`).
    - [x] REST API endpoints (`/projects` and `/tasks`) with automatic hourly rate inheritance, status transitions, and referential deletion protection.
    - [x] 100% passing automated test suite (`backend/tests/test_projects_and_tasks_api.py`).
    - [x] Frontend UI: `ProjectModal` and `TaskModal` with backdrop form protection, sleek tabular `ProjectTable` with 50-interval pagination, column sorting, search/client/status filters, and expandable nested tasks with inline status updates. (Kanban board completely removed per user request).
    - [x] Overview Dashboard: Linked `Active Engagements` KPI card to live database project metrics.
  - [ ] Live Timer with WebSocket sync + Manual time logging.
  - [ ] Invoice creation wizard, tax calculation, and PDF generator.

- [ ] **Phase 5: Financial & Wealth Module Implementation (Finance, Assets, ITR, Wealth)**
  - [ ] Accounts, transactions ledger, and P&L charts.
  - [ ] Asset registry and WDV/SLM depreciation engine.
  - [ ] ITR Helper with Old vs New Regime comparator and 44ADA calculator.
  - [ ] Wealth portfolio, net worth timeline, and asset allocation balance.

- [ ] **Phase 6: Integration, Zero-Hardcoding Settings UI, Polish & Testing**
  - [ ] Dynamic settings management screen for all lookup tables.
  - [ ] Database backup and JSON export/import workflows.
  - [ ] End-to-end user workflow verification.

---

## 4. Key Architectural Decisions (ADRs)

| ADR ID | Decision | Rationale | Status |
| :--- | :--- | :--- | :--- |
| **ADR-001** | SQLite in WAL mode | Zero setup, completely offline and private, handles concurrent reads and writes smoothly. | Accepted |
| **ADR-002** | Decoupled FastAPI + Next.js | Maximizes separation of concerns; Python provides powerful math/tax/PDF generation while Next.js provides instant client UX. | Accepted |
| **ADR-003** | Dynamic Settings Lookup Engine | Enforces the "zero hardcoding" constraint; tax laws and user categories evolve without requiring code modifications. | Accepted |
| **ADR-004** | Global WebSocket for Timer | Allows a seamless live stopwatch across multi-tab browsing without timer drift or desync. | Accepted |
| **ADR-005** | Automatic Git Version Control | Commits every single code change automatically upon verification to maintain a complete, unbroken audit trail. | Accepted |
| **ADR-006** | Modal Backdrop Dismissal Protection | Prevents dialog dismissal on backdrop click to safeguard extensive user form inputs from accidental loss. | Accepted |

