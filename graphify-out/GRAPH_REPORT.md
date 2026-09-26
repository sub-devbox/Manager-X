# Graph Report - Manager-X  (2026-09-26)

## Corpus Check
- 63 files · ~25,087 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 382 nodes · 548 edges · 34 communities (26 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9148bdca`
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
- config.py
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

## God Nodes (most connected - your core abstractions)
1. `User` - 21 edges
2. `login()` - 16 edges
3. `compilerOptions` - 16 edges
4. `register_first_user()` - 12 edges
5. `logout()` - 12 edges
6. `Base` - 12 edges
7. `AppShell()` - 10 edges
8. `get_current_user()` - 9 edges
9. `create_access_token()` - 9 edges
10. `decode_access_token()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `SecurityHeadersMiddleware` --uses--> `Base`  [INFERRED]
  backend/app/main.py → backend/app/core/database.py
- `Currency` --uses--> `Base`  [INFERRED]
  backend/app/models/settings_models.py → backend/app/core/database.py
- `SystemSetting` --uses--> `Base`  [INFERRED]
  backend/app/models/settings_models.py → backend/app/core/database.py
- `AuditLog` --uses--> `Base`  [INFERRED]
  backend/app/models/user_models.py → backend/app/core/database.py
- `User` --uses--> `Base`  [INFERRED]
  backend/app/models/user_models.py → backend/app/core/database.py

## Import Cycles
- None detected.

## Communities (34 total, 8 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, dependencies, lucide-react, next, react, react-dom, @tanstack/react-query (+24 more)

### Community 1 - "auth.py"
Cohesion: 0.08
Nodes (51): Any, check_auth_status(), get_client_ip(), get_current_user(), get_me(), get_optional_user(), login(), logout() (+43 more)

### Community 2 - "Base"
Cohesion: 0.08
Nodes (27): Base, get_db(), AsyncSession, set_sqlite_pragma(), datetime, utc_now(), client(), prepare_database() (+19 more)

### Community 3 - "settings.py"
Cohesion: 0.12
Nodes (38): create_backup_snapshot(), create_currency(), delete_currency(), download_database(), ensure_default_currencies(), _format_size(), get_company_profile(), get_theme_settings() (+30 more)

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

### Community 9 - "config.py"
Cohesion: 0.20
Nodes (9): Settings, generate_cuid(), Generate a collision-resistant unique identifier (CUID). Structure: prefix (1)…, to_base36(), BaseSettings, os, pathlib, pydantic_settings (+1 more)

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

## Knowledge Gaps
- **136 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `settings.py` to `auth.py`, `Base`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Base` connect `Base` to `auth.py`, `settings.py`, `main.py`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `get_db()` connect `Base` to `auth.py`, `settings.py`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08080808080808081 - nodes in this community are weakly interconnected._
- **Should `Base` be split into smaller, more focused modules?**
  _Cohesion score 0.0773109243697479 - nodes in this community are weakly interconnected._