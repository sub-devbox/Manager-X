# Graph Report - Manager-X  (2026-09-28)

## Corpus Check
- 132 files · ~97,024 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1105 nodes · 2207 edges · 73 communities (63 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb2a560e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- auth.py
- Currency
- settings.py
- compilerOptions
- Ponytail
- time_entries.py
- FastAPI ASGI Backend
- Finance Manager Module
- Window
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
- Features
- ShutdownPreventionService
- layout.tsx
- InvoiceModal.tsx
- gateways.py
- UserControl
- UserControl
- User
- TextBox
- project.ts
- TimeEntryTable.tsx
- AuthModels.cs
- ManagerX.Services
- MainWindow
- projects/page.tsx
- App
- ApiClient
- TimerService
- ProjectModels.cs
- RoutedEventArgs
- ManagerX.Desktop.csproj
- UserControl
- TrackerView
- tasks.py
- .ApiStatusBadge_MouseLeftButtonDown
- .SubmitNewProject_Click
- RoutedEventArgs
- api-client.ts
- projects.py
- Base
- invoice_schemas.py
- build_invoice_pdf
- AuthService
- get_db
- Settings
- TimeModels.cs

## God Nodes (most connected - your core abstractions)
1. `User` - 72 edges
2. `UserControl` - 56 edges
3. `MainWindow` - 50 edges
4. `TrackerView` - 45 edges
5. `Window` - 27 edges
6. `UserControl` - 27 edges
7. `Base` - 23 edges
8. `Currency` - 21 edges
9. `api` - 19 edges
10. `BackendSetupView` - 18 edges

## Surprising Connections (you probably didn't know these)
- `SecurityHeadersMiddleware` --uses--> `Base`  [INFERRED]
  backend/app/main.py → backend/app/core/database.py
- `Client` --uses--> `Base`  [INFERRED]
  backend/app/models/client_model.py → backend/app/core/database.py
- `PaymentGateway` --uses--> `Base`  [INFERRED]
  backend/app/models/gateway_model.py → backend/app/core/database.py
- `InvoiceItem` --uses--> `Base`  [INFERRED]
  backend/app/models/invoice_model.py → backend/app/core/database.py
- `Project` --uses--> `Base`  [INFERRED]
  backend/app/models/project_models.py → backend/app/core/database.py

## Import Cycles
- None detected.

## Communities (73 total, 10 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, dependencies, lucide-react, next, react, react-dom, @tanstack/react-query (+24 more)

### Community 1 - "auth.py"
Cohesion: 0.07
Nodes (53): check_auth_status(), get_client_ip(), get_current_user(), get_me(), get_optional_user(), login(), logout(), AsyncSession (+45 more)

### Community 2 - "Currency"
Cohesion: 0.09
Nodes (31): Currency, client(), prepare_database(), AsyncClient, asyncio, test_full_security_and_auth_lifecycle(), AsyncClient, asyncio (+23 more)

### Community 3 - "settings.py"
Cohesion: 0.10
Nodes (42): add_country(), create_backup_snapshot(), create_currency(), delete_country(), delete_currency(), download_database(), ensure_default_currencies(), _format_size() (+34 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 5 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 6 - "time_entries.py"
Cohesion: 0.16
Nodes (21): create_time_entry(), delete_time_entry(), _format_time_entry_response(), get_time_entry(), list_time_entries(), AsyncSession, delete, get (+13 more)

### Community 7 - "FastAPI ASGI Backend"
Cohesion: 0.29
Nodes (7): Argon2id Password Security, Brute-Force & Lockout System, FastAPI ASGI Backend, Next.js App Router Frontend, SQLite WAL Mode Database, Session Management & Revocation, Zero-Hardcoding Engine

### Community 8 - "Finance Manager Module"
Cohesion: 0.29
Nodes (7): Asset Manager Module, Finance Manager Module, ITR Helper Module, Invoice Generator Module, Project Manager Module, Time Tracker Module, Wealth Manager Module

### Community 9 - "Window"
Cohesion: 0.15
Nodes (18): ApiStatusDot, ApiStatusText, FullModeContainer, LoadingOverlay, LoadingStatusText, MainContent, MiniDigitsText, MiniProjectTitle (+10 more)

### Community 10 - "AppShell.tsx"
Cohesion: 0.10
Nodes (15): OverviewPage(), AppShell(), AppShellProps, Sidebar(), SidebarProps, BackupInfo, CompanyProfile, Currency (+7 more)

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

### Community 35 - "Features"
Cohesion: 0.07
Nodes (26): 1. Environment Setup, 2. Backend Setup, 3. Frontend Setup, 4. Windows Desktop App (Time Tracker), 5. Control Scripts (Batch), Backend Tests, Building & Publishing from Source:, 👥 Client Management (+18 more)

### Community 36 - "ShutdownPreventionService"
Cohesion: 0.16
Nodes (8): CancelEventArgs, bool, int, IntPtr, ShutdownPreventionService, DllImport, Func, SessionEndingCancelEventArgs

### Community 37 - "layout.tsx"
Cohesion: 0.29
Nodes (6): frontend_src_app_globals, metadata, QueryProvider(), AuthProvider(), getQueryClient(), makeQueryClient()

### Community 38 - "InvoiceModal.tsx"
Cohesion: 0.15
Nodes (17): InvoiceModal(), InvoiceModalProps, DEFAULT_INVOICE_WIDTHS, InvoiceTableProps, MIN_INVOICE_WIDTHS, SortDirection, SortField, ClientData (+9 more)

### Community 39 - "gateways.py"
Cohesion: 0.10
Nodes (30): build_gateway_response(), create_gateway(), delete_gateway(), get_gateway(), list_gateways(), AsyncSession, delete, get (+22 more)

### Community 40 - "UserControl"
Cohesion: 0.09
Nodes (32): BadgeVisibility, Description, EstimatedHours, FormattedDuration, ProjectName, ScheduleBadgeBgColor, ScheduleBadgeBorderColor, ScheduleBadgeText (+24 more)

### Community 41 - "UserControl"
Cohesion: 0.12
Nodes (19): ChangeServerButton, EmailInput, ErrorBorder, ErrorText, LoginButton, PasswordInput, RememberMeCheck, ServerUrlInput (+11 more)

### Community 42 - "User"
Cohesion: 0.24
Nodes (23): calculate_next_invoice_number(), create_invoice(), delete_invoice(), download_invoice_pdf(), extract_company_initials(), get_company_profile_dict(), get_invoice(), get_next_invoice_number() (+15 more)

### Community 43 - "TextBox"
Cohesion: 0.17
Nodes (8): DescriptionInput, EditDescriptionInput, EditDurationHoursInput, NewProjectNameInput, NewTaskEstHoursInput, NewTaskHeaderButton, NewTaskTitleInput, TextBox

### Community 44 - "project.ts"
Cohesion: 0.12
Nodes (26): PeriodFilter, TimeTrackerPage(), ProjectOption, SearchableProjectSelect(), SearchableProjectSelectProps, ClientOption, ProjectModal(), ProjectModalProps (+18 more)

### Community 45 - "TimeEntryTable.tsx"
Cohesion: 0.12
Nodes (19): InvoiceTable(), DEFAULT_PROJECT_WIDTHS, MIN_PROJECT_WIDTHS, ProjectTable(), ProjectTableProps, SortDirection, SortField, DEFAULT_TASK_WIDTHS (+11 more)

### Community 46 - "AuthModels.cs"
Cohesion: 0.47
Nodes (5): BackendSettings, ConnectionMode, TokenResponse, UserDto, UserLoginRequest

### Community 47 - "ManagerX.Services"
Cohesion: 0.35
Nodes (4): ManagerX.Models, ManagerX.Views, ManagerX, ManagerX.Services

### Community 48 - "MainWindow"
Cohesion: 0.15
Nodes (9): bool, DispatcherTimer, int, IntPtr, string, MainWindow, double, MouseEventArgs (+1 more)

### Community 49 - "projects/page.tsx"
Cohesion: 0.17
Nodes (20): ProjectSchedulerPage(), ProjectsPage(), PeriodFilter, TasksPage(), ClientOption, SearchableClientSelect(), SearchableClientSelectProps, TaskModal() (+12 more)

### Community 50 - "App"
Cohesion: 0.22
Nodes (7): Application, border, PART_ContentHost, App, Border, StartupEventArgs, ScrollViewer

### Community 51 - "ApiClient"
Cohesion: 0.25
Nodes (5): HttpClient, string, ApiClient, ApiException, Exception

### Community 52 - "TimerService"
Cohesion: 0.22
Nodes (4): DateTime, DispatcherTimer, TimerService, TimeSpan

### Community 53 - "ProjectModels.cs"
Cohesion: 0.22
Nodes (6): ClientDto, ProjectCreateRequest, ProjectDto, TaskCreateRequest, TaskDto, TaskStatusUpdateRequest

### Community 54 - "RoutedEventArgs"
Cohesion: 0.19
Nodes (7): MiniPauseButton, MiniStopButton, StopServicesButton, TitleLogoutButton, TitleRefreshButton, RoutedEventArgs, Button

### Community 56 - "UserControl"
Cohesion: 0.05
Nodes (44): CancellationToken, CancellationTokenSource, current, HttpClient, BackendLauncherService, BrowseFrontendButton, BrowsePythonButton, CheckAgainButton (+36 more)

### Community 57 - "TrackerView"
Cohesion: 0.17
Nodes (6): TimeEntryDto, TaskCombo, DispatcherTimer, TrackerView, List, SelectionChangedEventArgs

### Community 58 - "tasks.py"
Cohesion: 0.15
Nodes (27): create_task(), delete_task(), _format_task_response(), get_task(), list_tasks(), AsyncSession, delete, get (+19 more)

### Community 59 - ".ApiStatusBadge_MouseLeftButtonDown"
Cohesion: 0.28
Nodes (5): ApiStatusBadge, RootWindowBorder, WebStatusBadge, Border, MouseButtonEventArgs

### Community 60 - ".SubmitNewProject_Click"
Cohesion: 0.25
Nodes (5): NewProjectClientCombo, ProjectCombo, SubmitNewProjectButton, KeyEventArgs, ComboBox

### Community 61 - "RoutedEventArgs"
Cohesion: 0.13
Nodes (7): ResetButton, StartPauseButton, StopSaveButton, SubmitNewTaskButton, ViewTodayActivityButton, RoutedEventArgs, Button

### Community 62 - "api-client.ts"
Cohesion: 0.11
Nodes (17): CurrencySetting, Header(), HeaderProps, ClientData, ClientModal(), ClientModalProps, CurrencyOption, COMMON_CURRENCIES (+9 more)

### Community 63 - "projects.py"
Cohesion: 0.21
Nodes (19): create_project(), delete_project(), _format_project_response(), get_project(), list_projects(), list_projects_summary(), AsyncSession, delete (+11 more)

### Community 64 - "Base"
Cohesion: 0.25
Nodes (11): generate_cuid(), Generate a collision-resistant unique identifier (CUID). Structure: prefix (1)…, to_base36(), Base, Invoice, SystemSetting, datetime, DeclarativeBase (+3 more)

### Community 66 - "invoice_schemas.py"
Cohesion: 0.28
Nodes (12): ClientSummary, InvoiceBase, InvoiceCreate, InvoiceItemBase, InvoiceItemCreate, InvoiceItemResponse, InvoiceResponse, InvoiceUpdate (+4 more)

### Community 67 - "build_invoice_pdf"
Cohesion: 0.24
Nodes (6): build_invoice_pdf(), format_money(), PushToBottom, Any, Dynamically absorbs unused vertical space on the current page, pushing target…, Flowable

### Community 68 - "AuthService"
Cohesion: 0.24
Nodes (5): DateTime, SavedCredentials, AuthService, string, StorageService

### Community 69 - "get_db"
Cohesion: 0.29
Nodes (6): get_db(), AsyncSession, set_sqlite_pragma(), listens_for, sqlalchemy_ext_asyncio, sqlite3

### Community 71 - "Settings"
Cohesion: 0.50
Nodes (3): field_validator, Settings, BaseSettings

## Knowledge Gaps
- **225 isolated node(s):** `Border`, `ScrollViewer`, `ContentControl`, `net8.0-windows`, `Microsoft.NET.Sdk` (+220 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MainWindow` connect `MainWindow` to `.InitializeTrayIcon`, `ShutdownPreventionService`, `.ShowBackendSetupView`, `Window`, `UserControl`, `ManagerX.Services`, `RoutedEventArgs`, `UserControl`, `TrackerView`, `.ApiStatusBadge_MouseLeftButtonDown`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `User` connect `User` to `Base`, `auth.py`, `clients.py`, `settings.py`, `Currency`, `time_entries.py`, `gateways.py`, `tasks.py`, `projects.py`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `TrackerView` connect `TrackerView` to `UserControl`, `UserControl`, `TextBox`, `ManagerX.Services`, `MainWindow`, `.SubmitNewProject_Click`, `RoutedEventArgs`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `Border`, `ScrollViewer`, `ContentControl` to the rest of the system?**
  _225 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07364114552893045 - nodes in this community are weakly interconnected._
- **Should `Currency` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._