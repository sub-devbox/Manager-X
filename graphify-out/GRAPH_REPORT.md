# Graph Report - Manager-X  (2026-09-28)

## Corpus Check
- 131 files · ~96,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1098 nodes · 2174 edges · 67 communities (56 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5734b9bb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- auth.py
- Currency
- User
- compilerOptions
- Ponytail
- Base
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
- AuthContext.tsx
- InvoiceModal.tsx
- gateways.py
- UserControl
- UserControl
- GatewayModal.tsx
- TextBox
- projects/page.tsx
- InvoiceTable.tsx
- AuthModels.cs
- ManagerX.Services
- MainWindow
- time-tracker/page.tsx
- App
- ApiClient
- TimerService
- ProjectModels.cs
- RoutedEventArgs
- ManagerX.Desktop.csproj
- UserControl
- TrackerView
- projects.py
- .ApiStatusBadge_MouseLeftButtonDown
- .UpdateTimerUi
- Button
- api-client.ts
- .StopSaveButton_Click
- .ExitApplicationAsync
- AuthService

## God Nodes (most connected - your core abstractions)
1. `User` - 72 edges
2. `UserControl` - 56 edges
3. `MainWindow` - 50 edges
4. `TrackerView` - 44 edges
5. `Window` - 27 edges
6. `UserControl` - 27 edges
7. `Base` - 23 edges
8. `Currency` - 21 edges
9. `api` - 19 edges
10. `BackendSetupView` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Client` --uses--> `Base`  [INFERRED]
  backend/app/models/client_model.py → backend/app/core/database.py
- `PaymentGateway` --uses--> `Base`  [INFERRED]
  backend/app/models/gateway_model.py → backend/app/core/database.py
- `InvoiceItem` --uses--> `Base`  [INFERRED]
  backend/app/models/invoice_model.py → backend/app/core/database.py
- `Project` --uses--> `Base`  [INFERRED]
  backend/app/models/project_models.py → backend/app/core/database.py
- `Task` --uses--> `Base`  [INFERRED]
  backend/app/models/project_models.py → backend/app/core/database.py

## Import Cycles
- None detected.

## Communities (67 total, 11 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, dependencies, lucide-react, next, react, react-dom, @tanstack/react-query (+24 more)

### Community 1 - "auth.py"
Cohesion: 0.08
Nodes (51): check_auth_status(), get_client_ip(), get_current_user(), get_me(), get_optional_user(), login(), logout(), AsyncSession (+43 more)

### Community 2 - "Currency"
Cohesion: 0.09
Nodes (32): Currency, client(), prepare_database(), AsyncClient, asyncio, test_full_security_and_auth_lifecycle(), AsyncClient, asyncio (+24 more)

### Community 3 - "User"
Cohesion: 0.05
Nodes (87): calculate_next_invoice_number(), create_invoice(), delete_invoice(), download_invoice_pdf(), extract_company_initials(), get_company_profile_dict(), get_invoice(), get_next_invoice_number() (+79 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 5 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 6 - "Base"
Cohesion: 0.06
Nodes (44): create_time_entry(), delete_time_entry(), _format_time_entry_response(), get_time_entry(), list_time_entries(), AsyncSession, delete, get (+36 more)

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
Cohesion: 0.12
Nodes (12): OverviewPage(), AppShell(), AppShellProps, Sidebar(), SidebarProps, BackupInfo, CompanyProfile, Currency (+4 more)

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
Cohesion: 0.26
Nodes (6): bool, int, IntPtr, ShutdownPreventionService, DllImport, Func

### Community 37 - "AuthContext.tsx"
Cohesion: 0.20
Nodes (9): frontend_src_app_globals, metadata, QueryProvider(), AuthContext, AuthContextType, AuthProvider(), AuthUser, getQueryClient() (+1 more)

### Community 38 - "InvoiceModal.tsx"
Cohesion: 0.17
Nodes (14): ClientOption, SearchableClientSelectProps, InvoiceModal(), InvoiceModalProps, ClientData, ClientInvoiceSummary, CompanyProfileData, InvoiceCreatePayload (+6 more)

### Community 39 - "gateways.py"
Cohesion: 0.19
Nodes (20): build_gateway_response(), create_gateway(), delete_gateway(), get_gateway(), list_gateways(), AsyncSession, delete, get (+12 more)

### Community 40 - "UserControl"
Cohesion: 0.09
Nodes (32): BadgeVisibility, Description, EstimatedHours, FormattedDuration, ProjectName, ScheduleBadgeBgColor, ScheduleBadgeBorderColor, ScheduleBadgeText (+24 more)

### Community 41 - "UserControl"
Cohesion: 0.12
Nodes (19): ChangeServerButton, EmailInput, ErrorBorder, ErrorText, LoginButton, PasswordInput, RememberMeCheck, ServerUrlInput (+11 more)

### Community 42 - "GatewayModal.tsx"
Cohesion: 0.29
Nodes (7): COMMON_CURRENCIES, CurrencyOption, GatewayModal(), GatewayModalProps, GatewayCreatePayload, GatewayData, GatewayUpdatePayload

### Community 43 - "TextBox"
Cohesion: 0.22
Nodes (7): DescriptionInput, EditDescriptionInput, EditDurationMinutesInput, NewProjectNameInput, NewTaskEstHoursInput, NewTaskTitleInput, TextBox

### Community 44 - "projects/page.tsx"
Cohesion: 0.12
Nodes (26): PeriodFilter, SearchableClientSelect(), ProjectOption, SearchableProjectSelect(), SearchableProjectSelectProps, ClientOption, ProjectModal(), ProjectModalProps (+18 more)

### Community 45 - "InvoiceTable.tsx"
Cohesion: 0.12
Nodes (19): DEFAULT_INVOICE_WIDTHS, InvoiceTable(), InvoiceTableProps, MIN_INVOICE_WIDTHS, SortDirection, SortField, DEFAULT_PROJECT_WIDTHS, MIN_PROJECT_WIDTHS (+11 more)

### Community 46 - "AuthModels.cs"
Cohesion: 0.67
Nodes (3): TokenResponse, UserDto, UserLoginRequest

### Community 47 - "ManagerX.Services"
Cohesion: 0.24
Nodes (6): ManagerX.Models, ManagerX.Views, ManagerX, ManagerX.Services, TimeEntryCreateRequest, TimeEntryUpdateRequest

### Community 48 - "MainWindow"
Cohesion: 0.16
Nodes (9): bool, DispatcherTimer, int, IntPtr, string, MainWindow, double, MouseEventArgs (+1 more)

### Community 49 - "time-tracker/page.tsx"
Cohesion: 0.15
Nodes (17): PeriodFilter, ManualTimeModal(), ManualTimeModalProps, minutesToTime(), timeToMinutes(), toLocalDateStr(), toLocalTimeStr(), StartTimerModal() (+9 more)

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
Cohesion: 0.17
Nodes (7): MiniPauseButton, MiniStopButton, StopServicesButton, TitleLogoutButton, TitleRefreshButton, RoutedEventArgs, Button

### Community 56 - "UserControl"
Cohesion: 0.05
Nodes (46): CancellationToken, CancellationTokenSource, current, BackendSettings, ConnectionMode, HttpClient, BackendLauncherService, BrowseFrontendButton (+38 more)

### Community 57 - "TrackerView"
Cohesion: 0.17
Nodes (5): TimeEntryDto, SubmitNewTaskButton, RoutedEventArgs, TrackerView, List

### Community 58 - "projects.py"
Cohesion: 0.09
Nodes (48): create_project(), delete_project(), _format_project_response(), get_project(), list_projects(), list_projects_summary(), AsyncSession, delete (+40 more)

### Community 59 - ".ApiStatusBadge_MouseLeftButtonDown"
Cohesion: 0.28
Nodes (5): ApiStatusBadge, RootWindowBorder, WebStatusBadge, Border, MouseButtonEventArgs

### Community 60 - ".UpdateTimerUi"
Cohesion: 0.20
Nodes (6): NewProjectClientCombo, ProjectCombo, TaskCombo, KeyEventArgs, SelectionChangedEventArgs, ComboBox

### Community 61 - "Button"
Cohesion: 0.29
Nodes (6): NewTaskHeaderButton, ResetButton, StartPauseButton, SubmitNewProjectButton, ViewTodayActivityButton, Button

### Community 62 - "api-client.ts"
Cohesion: 0.16
Nodes (10): CurrencySetting, Header(), HeaderProps, ClientData, ClientModal(), ClientModalProps, CurrencyOption, api (+2 more)

### Community 68 - "AuthService"
Cohesion: 0.20
Nodes (5): DateTime, SavedCredentials, AuthService, string, StorageService

## Knowledge Gaps
- **225 isolated node(s):** `Border`, `ScrollViewer`, `ContentControl`, `net8.0-windows`, `Microsoft.NET.Sdk` (+220 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MainWindow` connect `MainWindow` to `.ExitApplicationAsync`, `.InitializeTrayIcon`, `ShutdownPreventionService`, `Window`, `UserControl`, `ManagerX.Services`, `RoutedEventArgs`, `UserControl`, `TrackerView`, `.ApiStatusBadge_MouseLeftButtonDown`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `User` connect `User` to `auth.py`, `clients.py`, `Currency`, `Base`, `gateways.py`, `projects.py`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `TrackerView` connect `TrackerView` to `UserControl`, `UserControl`, `TextBox`, `ManagerX.Services`, `MainWindow`, `.UpdateTimerUi`, `Button`, `.StopSaveButton_Click`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `Border`, `ScrollViewer`, `ContentControl` to the rest of the system?**
  _225 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `auth.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08013468013468013 - nodes in this community are weakly interconnected._
- **Should `Currency` be split into smaller, more focused modules?**
  _Cohesion score 0.08658536585365853 - nodes in this community are weakly interconnected._