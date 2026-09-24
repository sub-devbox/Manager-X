# Manager X — Project Memory & State Ledger

**Last Updated:** Phase 1 Initialization  
**Project Name:** Manager X  
**Project Root:** `d:/Coding/AI-Coding/Antigravity/Manager-X`  

---

## 1. Project Overview & Identity
Manager X is an integrated, local-first enterprise and life resource planning application built for independent professionals, consultants, and founders.

It combines 7 pillars into a cohesive platform:
1. **Project Manager**: Clients, milestones, tasks, boards.
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

---

## 3. Phase Roadmap & Execution Progress

- [x] **Phase 1: Foundational Specifications & Architecture**
  - [x] `product.md`: Product vision, target personas, ecosystem breakdown.
  - [x] `prd.md`: Exhaustive functional/non-functional requirements, acceptance criteria, zero-hardcoding spec.
  - [x] `architecture.md`: System topology, database schema (ERD), REST/WebSocket APIs, directory layout.
  - [x] `memory.md`: Project state ledger, architectural invariants, roadmap tracking.

- [ ] **Phase 2: Backend Core Infrastructure & Database Schema**
  - [ ] Initialize Python virtual environment & install dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `aiosqlite`, `pydantic`, `alembic`, `reportlab` / `weasyprint`).
  - [ ] Configure database engine (`sqlite+aiosqlite`), WAL mode, session dependency.
  - [ ] Build models for settings, currencies, tax schemes, clients, projects, tasks, time entries.
  - [ ] Build models for accounts, transactions, assets, ITR slabs, wealth holdings.
  - [ ] Seed initial dynamic configuration (standard currencies, GST rates, default categories, ITR slabs).

- [ ] **Phase 3: Frontend Foundation & Design System**
  - [ ] Scaffold Next.js project with TypeScript.
  - [ ] Implement design token system in `globals.css` (minimal clean dark/light themes, typography, elevation).
  - [ ] Build shared shell: Sidebar, Header, Global Floating Time Tracker component.
  - [ ] Setup API client and React Query configuration.

- [ ] **Phase 4: Operational Module Implementation (PM, TT, Invoices)**
  - [ ] Client & Project CRUD + Kanban Board.
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
