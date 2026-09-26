# Graph Report - Manager-X  (2026-09-26)

## Corpus Check
- 69 files · ~29,263 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 634 edges · 35 communities (27 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a349266`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- auth.py
- Base
- settings.py
- compilerOptions
- Ponytail
- main.py
- FastAPI ASGI Backend
- Finance Manager Module
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
- clients/page.tsx

## God Nodes (most connected - your core abstractions)
1. `User` - 29 edges
2. `login()` - 16 edges
3. `compilerOptions` - 16 edges
4. `Base` - 14 edges
5. `register_first_user()` - 12 edges
6. `logout()` - 12 edges
7. `AppShell()` - 11 edges
8. `get_current_user()` - 10 edges
9. `Currency` - 10 edges
10. `create_access_token()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `SecurityHeadersMiddleware` --uses--> `Base`  [INFERRED]
  backend/app/main.py → backend/app/core/database.py
- `AuditLog` --uses--> `Base`  [INFERRED]
  backend/app/models/user_models.py → backend/app/core/database.py
- `User` --uses--> `Base`  [INFERRED]
  backend/app/models/user_models.py → backend/app/core/database.py
- `get_current_user()` --references--> `User`  [EXTRACTED]
  backend/app/api/v1/endpoints/auth.py → backend/app/models/user_models.py
- `get_optional_user()` --references--> `User`  [EXTRACTED]
  backend/app/api/v1/endpoints/auth.py → backend/app/models/user_models.py

## Import Cycles
- None detected.

## Communities (35 total, 8 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, dependencies, lucide-react, next, react, react-dom, @tanstack/react-query (+24 more)

### Community 1 - "auth.py"
Cohesion: 0.08
Nodes (52): Any, check_auth_status(), get_client_ip(), get_current_user(), get_me(), get_optional_user(), login(), logout() (+44 more)

### Community 2 - "Base"
Cohesion: 0.07
Nodes (34): generate_cuid(), Generate a collision-resistant unique identifier (CUID). Structure: prefix (1)…, to_base36(), Base, get_db(), AsyncSession, set_sqlite_pragma(), Client (+26 more)

### Community 3 - "settings.py"
Cohesion: 0.09
Nodes (41): create_backup_snapshot(), create_currency(), delete_currency(), download_database(), ensure_default_currencies(), _format_size(), get_company_profile(), get_theme_settings() (+33 more)

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

### Community 10 - "AppShell.tsx"
Cohesion: 0.06
Nodes (23): frontend_src_app_globals, metadata, OverviewPage(), AppShell(), AppShellProps, GlobalTimerBar(), TimerState, Header() (+15 more)

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
Cohesion: 0.40
Nodes (4): 1. Identifiers & Primary Keys, 2. Referential Deletion Protection, 3. Currencies & Exchange Rates, Manager X Project Rules & Invariants

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
Nodes (22): create_client(), delete_client(), get_client(), list_clients(), list_clients_summary(), AsyncSession, delete, get (+14 more)

### Community 35 - "clients/page.tsx"
Cohesion: 0.32
Nodes (5): ClientData, ClientModal(), ClientModalProps, COUNTRIES, CurrencyOption

## Knowledge Gaps
- **139 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `auth.py`, `Base`, `settings.py`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `Base` connect `Base` to `auth.py`, `User`, `main.py`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Currency` connect `Base` to `User`, `settings.py`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `Base` (e.g. with `SecurityHeadersMiddleware` and `Client`) actually correct?**
  _`Base` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07792207792207792 - nodes in this community are weakly interconnected._