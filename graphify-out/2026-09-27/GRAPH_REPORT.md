# Graph Report - Manager-X  (2026-09-27)

## Corpus Check
- 131 files · ~92,174 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1040 nodes · 2040 edges · 67 communities (56 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `49f57b60`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- auth.py
- Currency
- User
- compilerOptions
- Ponytail
- time_entries.py
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
- clients.py
- Manager-X
- gateways.py
- layout.tsx
- InvoiceModal.tsx
- invoices.py
- UserControl
- UserControl
- GatewayModal.tsx
- SearchableProjectSelect.tsx
- api-client.ts
- InvoiceTable.tsx
- AuthService
- ManagerX.Services
- MainWindow
- ManualTimeModal.tsx
- App
- ApiClient
- TimerService
- ProjectModels.cs
- AuthModels.cs
- ManagerX.Desktop.csproj
- UserControl
- TrackerView
- tasks.py
- Base
- .UpdateTimerUi
- Button
- clients/page.tsx
- .StopSaveButton_Click
- Settings
- test_auth_api.py
- TimeModels.cs

## God Nodes (most connected - your core abstractions)
1. `User` - 72 edges
2. `UserControl` - 51 edges
3. `TrackerView` - 43 edges
4. `MainWindow` - 42 edges
5. `Base` - 23 edges
6. `Currency` - 21 edges
7. `Window` - 20 edges
8. `api` - 19 edges
9. `UserControl` - 17 edges
10. `TaskData` - 17 edges

## Surprising Connections (you probably didn't know these)
- `SecurityHeadersMiddleware` --uses--> `Base`  [INFERRED]
  backend/app/main.py → backend/app/core/database.py
- `Client` --uses--> `Base`  [INFERRED]
  backend/app/models/client_model.py → backend/app/core/database.py
- `PaymentGateway` --uses--> `Base`  [INFERRED]
  backend/app/models/gateway_model.py → backend/app/core/database.py
- `Invoice` --uses--> `Base`  [INFERRED]
  backend/app/models/invoice_model.py → backend/app/core/database.py
- `InvoiceItem` --uses--> `Base`  [INFERRED]
  backend/app/models/invoice_model.py → backend/app/core/database.py

## Import Cycles
- None detected.

## Communities (67 total, 11 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, dependencies, lucide-react, next, react, react-dom, @tanstack/react-query (+24 more)

### Community 1 - "auth.py"
Cohesion: 0.07
Nodes (53): check_auth_status(), get_client_ip(), get_current_user(), get_me(), get_optional_user(), login(), logout(), AsyncSession (+45 more)

### Community 2 - "Currency"
Cohesion: 0.10
Nodes (28): Currency, client(), prepare_database(), AsyncClient, asyncio, test_client_incoming_currency_and_equivalent_inr_auto_calc(), test_client_lifecycle_and_address_validation(), AsyncClient (+20 more)

### Community 3 - "User"
Cohesion: 0.13
Nodes (39): add_country(), create_backup_snapshot(), create_currency(), delete_country(), delete_currency(), download_database(), ensure_default_currencies(), _format_size() (+31 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 5 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 6 - "time_entries.py"
Cohesion: 0.12
Nodes (26): create_time_entry(), delete_time_entry(), _format_time_entry_response(), get_time_entry(), list_time_entries(), AsyncSession, delete, get (+18 more)

### Community 7 - "FastAPI ASGI Backend"
Cohesion: 0.29
Nodes (7): Argon2id Password Security, Brute-Force & Lockout System, FastAPI ASGI Backend, Next.js App Router Frontend, SQLite WAL Mode Database, Session Management & Revocation, Zero-Hardcoding Engine

### Community 8 - "Finance Manager Module"
Cohesion: 0.29
Nodes (7): Asset Manager Module, Finance Manager Module, ITR Helper Module, Invoice Generator Module, Project Manager Module, Time Tracker Module, Wealth Manager Module

### Community 9 - "projects.py"
Cohesion: 0.16
Nodes (25): create_project(), delete_project(), _format_project_response(), get_project(), list_projects(), list_projects_summary(), AsyncSession, delete (+17 more)

### Community 10 - "AppShell.tsx"
Cohesion: 0.09
Nodes (17): OverviewPage(), AppShell(), AppShellProps, Header(), HeaderProps, Sidebar(), SidebarProps, BackupInfo (+9 more)

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

### Community 34 - "clients.py"
Cohesion: 0.17
Nodes (24): build_client_response(), create_client(), delete_client(), get_client(), get_client_aggregates(), list_clients(), list_clients_summary(), AsyncSession (+16 more)

### Community 35 - "Manager-X"
Cohesion: 0.10
Nodes (20): 1. Environment Setup, 2. Backend Setup, 3. Frontend Setup, Backend Tests, 👥 Client Management, Contributing & Development Guidelines, 🛡️ Enterprise-Grade Security, Features (+12 more)

### Community 36 - "gateways.py"
Cohesion: 0.10
Nodes (30): build_gateway_response(), create_gateway(), delete_gateway(), get_gateway(), list_gateways(), AsyncSession, delete, get (+22 more)

### Community 37 - "layout.tsx"
Cohesion: 0.29
Nodes (6): frontend_src_app_globals, metadata, QueryProvider(), AuthProvider(), getQueryClient(), makeQueryClient()

### Community 38 - "InvoiceModal.tsx"
Cohesion: 0.17
Nodes (15): ClientOption, SearchableClientSelect(), SearchableClientSelectProps, InvoiceModal(), InvoiceModalProps, ClientData, ClientInvoiceSummary, CompanyProfileData (+7 more)

### Community 39 - "invoices.py"
Cohesion: 0.09
Nodes (41): calculate_next_invoice_number(), create_invoice(), delete_invoice(), download_invoice_pdf(), extract_company_initials(), get_company_profile_dict(), get_invoice(), get_next_invoice_number() (+33 more)

### Community 40 - "UserControl"
Cohesion: 0.09
Nodes (34): Description, EstimatedHours, FormattedDuration, ProjectName, TaskTitle, Title, ActiveTaskLabel, ActivityModalOverlay (+26 more)

### Community 41 - "UserControl"
Cohesion: 0.12
Nodes (18): EmailInput, ErrorBorder, ErrorText, LoginButton, PasswordInput, RememberMeCheck, ServerUrlInput, UserControl (+10 more)

### Community 42 - "GatewayModal.tsx"
Cohesion: 0.29
Nodes (7): COMMON_CURRENCIES, CurrencyOption, GatewayModal(), GatewayModalProps, GatewayCreatePayload, GatewayData, GatewayUpdatePayload

### Community 43 - "SearchableProjectSelect.tsx"
Cohesion: 0.27
Nodes (4): ProjectOption, SearchableProjectSelect(), SearchableProjectSelectProps, ApiError

### Community 44 - "api-client.ts"
Cohesion: 0.13
Nodes (25): PeriodFilter, PeriodFilter, ClientOption, ProjectModal(), ProjectModalProps, MONTH_NAMES, ProjectSchedulerCalendar(), ProjectSchedulerCalendarProps (+17 more)

### Community 45 - "InvoiceTable.tsx"
Cohesion: 0.09
Nodes (25): DEFAULT_INVOICE_WIDTHS, InvoiceTable(), InvoiceTableProps, MIN_INVOICE_WIDTHS, SortDirection, SortField, DEFAULT_PROJECT_WIDTHS, MIN_PROJECT_WIDTHS (+17 more)

### Community 46 - "AuthService"
Cohesion: 0.24
Nodes (5): DateTime, SavedCredentials, AuthService, string, StorageService

### Community 47 - "ManagerX.Services"
Cohesion: 0.27
Nodes (4): ManagerX.Models, ManagerX.Views, ManagerX, ManagerX.Services

### Community 48 - "MainWindow"
Cohesion: 0.05
Nodes (36): CancelEventArgs, FullModeContainer, LoadingOverlay, LoadingStatusText, MainContent, MiniDigitsText, MiniPauseButton, MiniProjectTitle (+28 more)

### Community 49 - "ManualTimeModal.tsx"
Cohesion: 0.26
Nodes (10): ManualTimeModal(), ManualTimeModalProps, minutesToTime(), timeToMinutes(), toLocalDateStr(), toLocalTimeStr(), TimeEntryTableProps, TimeEntryCreatePayload (+2 more)

### Community 50 - "App"
Cohesion: 0.22
Nodes (7): Application, border, PART_ContentHost, App, Border, StartupEventArgs, ScrollViewer

### Community 51 - "ApiClient"
Cohesion: 0.25
Nodes (5): HttpClient, string, ApiClient, ApiException, Exception

### Community 52 - "TimerService"
Cohesion: 0.22
Nodes (4): DateTime, TimerService, DispatcherTimer, TimeSpan

### Community 53 - "ProjectModels.cs"
Cohesion: 0.25
Nodes (5): ClientDto, ProjectCreateRequest, ProjectDto, TaskCreateRequest, TaskDto

### Community 54 - "AuthModels.cs"
Cohesion: 0.40
Nodes (4): BackendSettings, TokenResponse, UserDto, UserLoginRequest

### Community 56 - "UserControl"
Cohesion: 0.07
Nodes (32): CancellationToken, CancellationTokenSource, current, HttpClient, BackendLauncherService, BrowsePythonButton, CheckAgainButton, ConnectCustomButton (+24 more)

### Community 57 - "TrackerView"
Cohesion: 0.17
Nodes (5): TimeEntryDto, SubmitNewTaskButton, RoutedEventArgs, TrackerView, List

### Community 58 - "tasks.py"
Cohesion: 0.18
Nodes (21): create_task(), delete_task(), _format_task_response(), get_task(), list_tasks(), AsyncSession, delete, get (+13 more)

### Community 59 - "Base"
Cohesion: 0.20
Nodes (13): generate_cuid(), Generate a collision-resistant unique identifier (CUID). Structure: prefix (1)…, to_base36(), Base, set_sqlite_pragma(), Project, datetime, DeclarativeBase (+5 more)

### Community 60 - ".UpdateTimerUi"
Cohesion: 0.17
Nodes (7): NewProjectClientCombo, NewTaskTitleInput, ProjectCombo, TaskCombo, KeyEventArgs, SelectionChangedEventArgs, ComboBox

### Community 61 - "Button"
Cohesion: 0.25
Nodes (6): NewTaskHeaderButton, ResetButton, StartPauseButton, SubmitNewProjectButton, ViewTodayActivityButton, Button

### Community 62 - "clients/page.tsx"
Cohesion: 0.32
Nodes (5): CurrencySetting, ClientData, ClientModal(), ClientModalProps, CurrencyOption

### Community 64 - "Settings"
Cohesion: 0.50
Nodes (3): field_validator, Settings, BaseSettings

### Community 65 - "test_auth_api.py"
Cohesion: 0.50
Nodes (3): AsyncClient, asyncio, test_full_security_and_auth_lifecycle()

## Knowledge Gaps
- **218 isolated node(s):** `Border`, `ScrollViewer`, `Border`, `ContentControl`, `net8.0-windows` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `auth.py`, `clients.py`, `test_auth_api.py`, `gateways.py`, `time_entries.py`, `invoices.py`, `projects.py`, `tasks.py`, `Base`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `MainWindow` connect `MainWindow` to `UserControl`, `UserControl`, `TrackerView`, `ManagerX.Services`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `TrackerView` connect `TrackerView` to `UserControl`, `UserControl`, `ManagerX.Services`, `MainWindow`, `.UpdateTimerUi`, `Button`, `.StopSaveButton_Click`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `Base` (e.g. with `SecurityHeadersMiddleware` and `Client`) actually correct?**
  _`Base` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Border`, `ScrollViewer`, `Border` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07364114552893045 - nodes in this community are weakly interconnected._