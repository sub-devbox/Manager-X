# Graph Report - Manager-X  (2026-09-24)

## Corpus Check
- Corpus is ~11,154 words - fits in a single context window. You may not need a graph.

## Summary
- 177 nodes · 279 edges · 11 communities
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.95)
- Token cost: 1,200 input · 450 output

## Community Hubs (Navigation)
- Frontend UI & Login Experience
- Cryptographic Security & Password Hashing
- Database Engine & Test Fixtures
- Authentication Endpoints & Session Management
- TypeScript & Tooling Configuration
- Authentication Data Contracts & Schemas
- ASGI Application & Middleware
- Core Architecture & Security Invariants
- Operational ERP & Wealth Modules
- Application Environment Configuration
- Frontend Layout & Global Styling

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `login()` - 15 edges
3. `logout()` - 12 edges
4. `register_first_user()` - 11 edges
5. `User` - 11 edges
6. `Base` - 10 edges
7. `create_access_token()` - 9 edges
8. `decode_access_token()` - 8 edges
9. `get_current_user()` - 7 edges
10. `get_client_ip()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `check_auth_status()` --uses--> `User`  [INFERRED]
  backend/app/api/v1/endpoints/auth.py → backend/app/models/user_models.py
- `register_first_user()` --uses--> `UserRegister`  [INFERRED]
  backend/app/api/v1/endpoints/auth.py → backend/app/schemas/auth_schemas.py
- `login()` --uses--> `TokenResponse`  [INFERRED]
  backend/app/api/v1/endpoints/auth.py → backend/app/schemas/auth_schemas.py
- `login()` --uses--> `UserLogin`  [INFERRED]
  backend/app/api/v1/endpoints/auth.py → backend/app/schemas/auth_schemas.py
- `logout()` --uses--> `MessageResponse`  [INFERRED]
  backend/app/api/v1/endpoints/auth.py → backend/app/schemas/auth_schemas.py

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "Frontend UI & Login Experience"
Cohesion: 0.06
Nodes (31): eslintConfig, dependencies, lucide-react, next, react, react-dom, devDependencies, eslint (+23 more)

### Community 1 - "Cryptographic Security & Password Hashing"
Cohesion: 0.12
Nodes (23): Any, create_access_token(), decode_access_token(), dummy_verify(), get_password_hash(), datetime, Safely verify password against hash using constant-time evaluation., Run dummy verification to prevent timing attack enumeration. (+15 more)

### Community 2 - "Database Engine & Test Fixtures"
Cohesion: 0.12
Nodes (17): asyncio, get_db(), AsyncSession, set_sqlite_pragma(), datetime, utc_now(), prepare_database(), test_full_security_and_auth_lifecycle() (+9 more)

### Community 3 - "Authentication Endpoints & Session Management"
Cohesion: 0.21
Nodes (19): get_client_ip(), get_current_user(), login(), logout(), AsyncSession, Request, Initial bootstrap registration for the owner/administrator. Enforces strict…, Production-grade login handler: 1. Brute-force / account lockout defense 2.… (+11 more)

### Community 4 - "TypeScript & Tooling Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 5 - "Authentication Data Contracts & Schemas"
Cohesion: 0.24
Nodes (14): check_auth_status(), get_me(), get, Returns initial setup state: if 0 users exist, allow initial administrator…, Returns the authenticated user's profile., AuthStatusOut, MessageResponse, TokenResponse (+6 more)

### Community 6 - "ASGI Application & Middleware"
Cohesion: 0.18
Nodes (10): health_check(), lifespan(), get, Request, SecurityHeadersMiddleware, BaseHTTPMiddleware, contextlib, FastAPI (+2 more)

### Community 7 - "Core Architecture & Security Invariants"
Cohesion: 0.29
Nodes (7): Argon2id Password Security, Brute-Force & Lockout System, FastAPI ASGI Backend, Next.js App Router Frontend, SQLite WAL Mode Database, Session Management & Revocation, Zero-Hardcoding Engine

### Community 8 - "Operational ERP & Wealth Modules"
Cohesion: 0.29
Nodes (7): Asset Manager Module, Finance Manager Module, ITR Helper Module, Invoice Generator Module, Project Manager Module, Time Tracker Module, Wealth Manager Module

### Community 9 - "Application Environment Configuration"
Cohesion: 0.29
Nodes (6): Settings, BaseSettings, os, pathlib, pydantic_settings, secrets

### Community 10 - "Frontend Layout & Global Styling"
Cohesion: 0.29
Nodes (4): nextConfig, frontend_src_app_globals, metadata, next

## Knowledge Gaps
- **52 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 94 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Authentication Endpoints & Session Management` to `Database Engine & Test Fixtures`, `Authentication Data Contracts & Schemas`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `login()` connect `Authentication Endpoints & Session Management` to `Cryptographic Security & Password Hashing`, `Authentication Data Contracts & Schemas`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `create_access_token()` connect `Cryptographic Security & Password Hashing` to `Authentication Endpoints & Session Management`, `Authentication Data Contracts & Schemas`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `login()` (e.g. with `AuditLog` and `User`) actually correct?**
  _`login()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `logout()` (e.g. with `AuditLog` and `User`) actually correct?**
  _`logout()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `register_first_user()` (e.g. with `AuditLog` and `User`) actually correct?**
  _`register_first_user()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `User` (e.g. with `check_auth_status()` and `get_current_user()`) actually correct?**
  _`User` has 7 INFERRED edges - model-reasoned connections that need verification._