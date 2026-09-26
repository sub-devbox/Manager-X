# Graph Report - Manager-X  (2026-09-26)

## Corpus Check
- 99 files · ~73,166 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 644 nodes · 1239 edges · 39 communities (31 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da0ac251`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- auth.py
- Currency
- settings.py
- compilerOptions
- Ponytail
- main.py
- FastAPI ASGI Backend
- Finance Manager Module
- projects.py
- AppShell.tsx
- Ponytail
- Ponytail Help
- Ponytail Help
- Manager X — Project Memory & State Ledger
- ponytail/skills/ponytail-audit/SKILL.md
- Ponytail Gain
- ponytail/skills/ponytail-review/SKILL.md
- Manager X Project Rules & Invariants
- .agents/skills/ponytail-audit/SKILL.md
- Ponytail Gain
- .agents/skills/ponytail-review/SKILL.md
- ponytail/skills/ponytail-debt/SKILL.md
- .agents/skills/ponytail-debt/SKILL.md
- README.md
- AGENTS.md
- ponytail/rules/ponytail.md
- rules/graphify.md
- .agents/rules/ponytail.md
- workflows/graphify.md
- frontend/AGENTS.md
- eslint.config.mjs
- next.config.ts
- User
- projects/page.tsx
- time_entries.py
- InvoiceModal.tsx
- invoices.py

## God Nodes (most connected - your core abstractions)
1. `User` - 64 edges
2. `Base` - 21 edges
3. `Currency` - 18 edges
4. `login()` - 16 edges
5. `compilerOptions` - 16 edges
6. `TaskData` - 15 edges
7. `get_current_user()` - 13 edges
8. `ProjectData` - 13 edges
9. `register_first_user()` - 12 edges
10. `logout()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `SecurityHeadersMiddleware` --uses--> `Base`  [INFERRED]
  backend/app/main.py → backend/app/core/database.py
- `Client` --uses--> `Base`  [INFERRED]
  backend/app/models/client_model.py → backend/app/core/database.py
- `Project` --uses--> `Base`  [INFERRED]
  backend/app/models/project_models.py → backend/app/core/database.py
- `Task` --uses--> `Base`  [INFERRED]
  backend/app/models/project_models.py → backend/app/core/database.py
- `Currency` --uses--> `Base`  [INFERRED]
  backend/app/models/settings_models.py → backend/app/core/database.py

## Import Cycles
- None detected.

## Communities (39 total, 8 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, dependencies, lucide-react, next, react, react-dom, @tanstack/react-query (+24 more)

### Community 1 - "auth.py"
Cohesion: 0.08
Nodes (50): check_auth_status(), get_client_ip(), get_current_user(), get_me(), get_optional_user(), login(), logout(), AsyncSession (+42 more)

### Community 2 - "Currency"
Cohesion: 0.10
Nodes (27): Currency, client(), prepare_database(), AsyncClient, asyncio, test_full_security_and_auth_lifecycle(), AsyncClient, asyncio (+19 more)

### Community 3 - "settings.py"
Cohesion: 0.09
Nodes (44): add_country(), create_backup_snapshot(), create_currency(), delete_country(), delete_currency(), download_database(), ensure_default_currencies(), _format_size() (+36 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 5 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 6 - "main.py"
Cohesion: 0.17
Nodes (10): health_check(), lifespan(), get, Request, SecurityHeadersMiddleware, BaseHTTPMiddleware, contextlib, FastAPI (+2 more)

### Community 7 - "FastAPI ASGI Backend"
Cohesion: 0.29
Nodes (7): Argon2id Password Security, Brute-Force & Lockout System, FastAPI ASGI Backend, Next.js App Router Frontend, SQLite WAL Mode Database, Session Management & Revocation, Zero-Hardcoding Engine

### Community 8 - "Finance Manager Module"
Cohesion: 0.29
Nodes (7): Asset Manager Module, Finance Manager Module, ITR Helper Module, Invoice Generator Module, Project Manager Module, Time Tracker Module, Wealth Manager Module

### Community 9 - "projects.py"
Cohesion: 0.09
Nodes (46): create_project(), delete_project(), _format_project_response(), get_project(), list_projects(), list_projects_summary(), AsyncSession, delete (+38 more)

### Community 10 - "AppShell.tsx"
Cohesion: 0.06
Nodes (26): frontend_src_app_globals, metadata, OverviewPage(), AppShell(), AppShellProps, GlobalTimerBar(), Header(), HeaderProps (+18 more)

### Community 11 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 12 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 13 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 14 - "Manager X — Project Memory & State Ledger"
Cohesion: 0.33
Nodes (5): 1. Project Overview & Identity, 2. Architectural Invariants & Rules, 3. Phase Roadmap & Execution Progress, 4. Key Architectural Decisions (ADRs), Manager X — Project Memory & State Ledger

### Community 15 - "ponytail/skills/ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 16 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 17 - "ponytail/skills/ponytail-review/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 18 - "Manager X Project Rules & Invariants"
Cohesion: 0.25
Nodes (7): 1. Identifiers & Primary Keys, 2. Referential Deletion Protection, 3. Currencies & Exchange Rates, 4. Automatic Git Version Control, 5. Modal Backdrop Dismissal Protection (Form & Data Safety), 6. Uniform Sheet & Table Presentation, Manager X Project Rules & Invariants

### Community 19 - ".agents/skills/ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 20 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 21 - ".agents/skills/ponytail-review/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Examples, Format, Scoring

### Community 22 - "ponytail/skills/ponytail-debt/SKILL.md"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

### Community 23 - ".agents/skills/ponytail-debt/SKILL.md"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

### Community 24 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 34 - "User"
Cohesion: 0.17
Nodes (23): create_client(), delete_client(), get_client(), list_clients(), list_clients_summary(), AsyncSession, delete, get (+15 more)

### Community 35 - "projects/page.tsx"
Cohesion: 0.06
Nodes (56): PeriodFilter, PeriodFilter, TimerState, DEFAULT_INVOICE_WIDTHS, InvoiceTable(), InvoiceTableProps, MIN_INVOICE_WIDTHS, SortDirection (+48 more)

### Community 36 - "time_entries.py"
Cohesion: 0.08
Nodes (39): create_invoice(), create_time_entry(), delete_time_entry(), _format_time_entry_response(), get_time_entry(), list_time_entries(), AsyncSession, delete (+31 more)

### Community 38 - "InvoiceModal.tsx"
Cohesion: 0.16
Nodes (16): ClientOption, SearchableClientSelect(), SearchableClientSelectProps, GATEWAY_OPTIONS, InvoiceModal(), InvoiceModalProps, ClientData, ClientInvoiceSummary (+8 more)

### Community 39 - "invoices.py"
Cohesion: 0.10
Nodes (38): calculate_next_invoice_number(), delete_invoice(), download_invoice_pdf(), extract_company_initials(), get_company_profile_dict(), get_invoice(), get_next_invoice_number(), get_unbilled_tasks() (+30 more)

## Knowledge Gaps
- **172 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `auth.py`, `Currency`, `settings.py`, `time_entries.py`, `invoices.py`, `projects.py`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `Currency` connect `Currency` to `User`, `settings.py`, `time_entries.py`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Base` connect `time_entries.py` to `auth.py`, `User`, `settings.py`, `Currency`, `main.py`, `projects.py`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `Base` (e.g. with `SecurityHeadersMiddleware` and `Client`) actually correct?**
  _`Base` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Currency` (e.g. with `Client` and `Base`) actually correct?**
  _`Currency` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._