# Manager X — Product Requirements Document (PRD)

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Architecture:** FastAPI (Python 3.11+), Next.js (App Router, TypeScript), SQLite (WAL mode)  

---

## 1. System Vision & Objective
Manager X provides an integrated operational and financial operating system for solo operators, freelancers, and small boutique studios. It unifies project tracking, billable hour capture, client invoicing, cashflow accounting, fixed asset depreciation, tax estimation (ITR), and personal/business wealth portfolio monitoring into a single unified local-first platform.

---

## 2. Core Architectural & Design Invariants

| Invariant | Specification |
| :--- | :--- |
| **Zero Hardcoding** | Tax slabs, fiscal years, currencies, payment methods, transaction categories, depreciation rates, and invoice prefixes must be stored in database lookup tables or configuration registries. No magic numbers or hardcoded country codes in application logic. |
| **Minimalist Aesthetic** | Clean, high-density yet breathable layout, dark/light theme toggle, subtle micro-interactions, monospace figures for financial data, zero visual noise. |
| **Local-First & Resilient** | Powered by SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`), automatic atomic transactions, and one-click data snapshots. |
| **Strict Type Safety** | Pydantic v2 schemas on the FastAPI backend; TypeScript interfaces and Zod schemas on the Next.js frontend. |

---

## 3. Module Specifications & Requirements

### 3.1 Module 1: Project Management (PM)
*Purpose: Manage clients, project milestones, tasks, and deliverables.*

- **Functional Requirements:**
  - **Client Directory**: Store client business info, tax IDs (GSTIN/VAT/EIN), currency preference, billing email, standard billing rate, and payment terms.
  - **Project Hierarchies**: Client $\rightarrow$ Project $\rightarrow$ Milestones $\rightarrow$ Tasks.
  - **Billing Types**: Hourly rate, Fixed price milestone, or Non-billable internal project.
  - **Task Management**:
    - Statuses: Configurable via settings (Default: `Backlog`, `In Progress`, `Review`, `Done`).
    - Priority: Configurable (`Low`, `Medium`, `High`, `Urgent`).
    - Estimated vs. actual hours tracked.
    - Tags, due dates, checklists, and rich markdown descriptions.
  - **Board Views**: Kanban Board, Grouped Table View, Milestone Timeline.

### 3.2 Module 2: Time Tracker (TT)
*Purpose: Accurate billable and non-billable time capture tied to project deliverables.*

- **Functional Requirements:**
  - **Live Timer**: One-click start/stop stopwatch bar accessible globally across the UI.
  - **Manual Entry**: Backfill missing hours with start/end time or duration.
  - **Project & Task Binding**: Each log must bind to a Project and optionally a specific Task.
  - **Billable Status**: Automatically inherit project/client billable rates with manual override capability per entry.
  - **Invoiced Flag**: Time entries are marked `unbilled` or `billed` (with linked `invoice_id`). Billed entries are locked against accidental modification or deletion.
  - **Analytics**: Weekly/Monthly heatmaps, client hours distribution, and billable utilization percentage.

### 3.3 Module 3: Invoice Generator (IG)
*Purpose: Convert time entries and milestone deliverables into professional, customizable invoices.*

- **Functional Requirements:**
  - **Invoice Creation Wizard**:
    - Select Client $\rightarrow$ Auto-populate pending unbilled time entries and unbilled milestones.
    - Add custom line items (services, products, reimbursements).
  - **Dynamic Tax Engine**:
    - Configurable tax rules (e.g., GST 18%, IGST, CGST+SGST, VAT, or 0% Export with LUT).
    - Multi-tax calculation support per line item or overall invoice.
  - **Multi-Currency & Exchange Rates**:
    - Invoice in client currency (USD, EUR, GBP, AUD, etc.) while recording base currency value (e.g., INR) via configurable exchange rate.
  - **Invoice Status Machine**:
    - `Draft` $\rightarrow$ `Issued` $\rightarrow$ `Partially Paid` $\rightarrow$ `Paid` $\rightarrow$ `Overdue` $\rightarrow$ `Void`.
  - **Output Generation**:
    - Pixel-perfect HTML-to-PDF generation (embedded bank transfer details, UPI QR code, notes, and digital signature block).
  - **Payment Tracking**:
    - Record partial or full payments directly linked to the Finance Manager ledger.

### 3.4 Module 4: Finance Manager (FM)
*Purpose: Comprehensive personal & professional cashflow management and ledger.*

- **Functional Requirements:**
  - **Multi-Account Support**: Bank accounts, Cash, Credit cards, Wallets, and Escrow accounts.
  - **Transaction Ledger**:
    - Types: `Income`, `Expense`, `Transfer` (inter-account).
    - Attributes: Date, Account, Category, Sub-category, Amount, Currency, Reference Number, Attachments (receipt image/PDF), Notes, Tax deductible flag.
  - **Dynamic Categories**:
    - User-defined tree structure (e.g., `Operating Expenses` $\rightarrow$ `Cloud Hosting`, `Software Subscriptions`, `Office Rent`).
  - **Recurring Transactions**:
    - Automated schedule for monthly subscriptions, recurring client retainers, and rent.
  - **Financial Reports**:
    - Real-time Income Statement (P&L), Cashflow Statement, Category-wise expense breakdown charts.

### 3.5 Module 5: Asset Manager (AM)
*Purpose: Register and depreciate capital goods, equipment, and intangible intellectual assets.*

- **Functional Requirements:**
  - **Asset Classification**:
    - Hardware (Laptops, Cameras, Desktops, Servers), Office Furniture, Intangibles (Domains, Software Licenses, Trademarks), Vehicles.
  - **Cost & Purchase Registry**:
    - Purchase date, vendor, purchase price, invoice attachment, serial number, warranty expiration date.
  - **Depreciation Engine**:
    - Supports both **Straight Line Method (SLM)** and **Written Down Value (WDV)**.
    - Configurable asset class depreciation rates (e.g., Computers 40% WDV under IT Act, Furniture 10%).
    - Automatic annual/monthly depreciation ledger entries pushed to the Finance/ITR expense deductions.
  - **Disposal / Scrap Management**:
    - Record asset sale or retirement, calculating capital gain or loss on disposal.

### 3.6 Module 6: ITR Helper (Income Tax Return & Planning)
*Purpose: Tax calculation, regime comparison, deductions tracking, and advance tax scheduling.*

- **Functional Requirements:**
  - **Jurisdiction Configuration**:
    - Flexible rule engine defaulting to Indian Income Tax rules (FY 2024-25 / AY 2025-26 and forward).
    - Fully configurable tax brackets, rebate thresholds (e.g., Sec 87A), and cess percentages.
  - **Regime Comparator**:
    - Side-by-side computation of tax liability under **Old Regime** vs. **New Regime**.
  - **Income Sources Aggregator**:
    - Business / Professional Income (Regular P&L or Presumptive Taxation under Section 44ADA @ 50% gross receipts).
    - Salary income (if any), Capital Gains (STCG & LTCG from Wealth module), Income from Other Sources (Interest, Dividends).
  - **Deduction & Exemption Vault (Old Regime)**:
    - Section 80C (PPF, ELSS, EPF, Life Insurance - limit dynamic, default ₹1.5L).
    - Section 80D (Health Insurance for self & parents).
    - Section 80CCD(1B) (NPS additional ₹50,000).
    - Home loan interest (Section 24b) and HRA exemption calculator.
  - **Advance Tax & TDS Reconciliation**:
    - Quarterly Advance Tax schedule (15% Jun 15, 45% Sep 15, 75% Dec 15, 100% Mar 15).
    - Form 26AS / AIS reconciliation log for TDS deducted by clients.

### 3.7 Module 7: Wealth Manager (WM)
*Purpose: Net worth tracking, multi-asset portfolio monitoring, and allocation rebalancing.*

- **Functional Requirements:**
  - **Asset Class Registry**:
    - Equities (Stocks), Mutual Funds, Fixed Deposits/Bonds, Provident Funds (EPF/PPF), Real Estate, Gold/Precious Metals, Cryptocurrencies, Liquid Cash.
  - **Holding Accounts & Portfolios**:
    - Group by goal (e.g., Retirement, Emergency Fund, House Downpayment, Freedom Fund).
  - **Manual & Valuation Updates**:
    - Log quantity, average purchase price, current market price/NAV, and latest valuation date.
  - **Net Worth Metrics**:
    - Total Assets $-$ Total Liabilities = Current Net Worth.
    - Historic timeline chart (monthly snapshot records).
  - **Target vs. Actual Asset Allocation**:
    - Visual radar/donut chart comparing current allocation against target risk profile (e.g., 60% Equity, 20% Debt, 10% Gold, 10% Cash) with rebalancing advice.

---

## 4. Zero-Hardcoding Settings & Configuration Engine

All business logic variables reside in database-backed configurations:
1. `app_settings`: Global key-value store (base currency, date format, company name, GSTIN, default payment terms).
2. `currencies`: Currency codes, symbols, precision, and exchange rates.
3. `tax_schemes`: Dynamic tax rates (GST rates: 0%, 5%, 12%, 18%, 28%, IGST split rules).
4. `itr_slabs`: Financial Year, Regime Name, Lower Limit, Upper Limit, Tax Rate (%), Surcharge, Cess.
5. `itr_deduction_limits`: Section code, maximum deduction limit, eligible regime applicability.
6. `asset_categories`: Name, default depreciation method (SLM/WDV), annual depreciation rate (%).
7. `transaction_categories`: Hierarchical income/expense categories and tax-deductibility tags.

---

## 5. Non-Functional Requirements

### 5.1 Performance & Responsiveness
- Backend response times $< 50\text{ms}$ for standard CRUD operations via SQLite indexes and async FastAPI.
- Frontend Client-Side Rendering with Next.js App Router for instantaneous screen transitions.
- Offline-ready local database operation without external cloud dependencies.

### 5.2 Security & Data Privacy
- Local SQLite database stored in a dedicated user-configurable data path (`./data/manager_x.db`).
- Optional database encryption capability (SQLCipher support ready).
- Secure CORS policies configured strictly for the local frontend port.

### 5.3 Reliability & Backups
- SQLite Write-Ahead Logging (`WAL`) to prevent database corruption during sudden shutdowns.
- Automated daily timestamped database snapshots in `./backups/`.
- 1-click JSON/Zip export and import of all user records.

---

## 6. Acceptance Criteria Matrix

| Module | Acceptance Criteria |
| :--- | :--- |
| **PM** | Create client $\rightarrow$ create project $\rightarrow$ assign tasks $\rightarrow$ verify Kanban state transitions without page refresh. |
| **TT** | Start live timer $\rightarrow$ navigate across routes $\rightarrow$ stop timer $\rightarrow$ verify log is saved and marked unbilled. |
| **IG** | Select client $\rightarrow$ aggregate unbilled hours $\rightarrow$ generate preview $\rightarrow$ download valid PDF with QR code and correct tax sum. |
| **FM** | Record income from invoice payment $\rightarrow$ record business expense $\rightarrow$ verify account balance and P&L update instantly. |
| **AM** | Add hardware asset $\rightarrow$ run depreciation calculation $\rightarrow$ verify correct WDV reduction and synced depreciation expense. |
| **ITR** | Input annual professional receipts $\rightarrow$ toggle 44ADA vs Regular $\rightarrow$ toggle Old vs New Regime $\rightarrow$ verify accurate tax slab breakdown. |
| **WM** | Add stock and cash holdings $\rightarrow$ inspect net worth graph $\rightarrow$ verify asset allocation matches aggregate values. |
