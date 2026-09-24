# Manager X — Product Vision & Strategy

## 1. Executive Summary
**Manager X** is an all-in-one, local-first personal and professional ERP (Enterprise & Life Resource Planning) workspace tailored for independent consultants, freelancers, agency owners, and high-performing professionals. 

It synthesizes seven traditionally fragmented domains into a single, cohesive, private, and customizable system:
1. **Project Management** (Kanban, Milestones, Sprints, Tasks)
2. **Time Tracking** (Live timers, billable logs, idle detection, timesheet approval)
3. **Invoice Generation** (Multi-currency, tax-compliant PDF/HTML invoices, client billing records)
4. **Finance Management** (Cashflow, income/expense tracking, categorizations, P&L statements)
5. **Asset Management** (Depreciating fixed assets, licenses, hardware, warranty tracking)
6. **ITR Helper** (Tax brackets, regime simulation [Old vs New], deductions [80C, 80D, etc.], capital gains summary)
7. **Wealth Management** (Net worth tracking, portfolio allocations, investments [stocks, mutual funds, gold, real estate, cash])

---

## 2. Core Value Proposition
- **Single Source of Truth**: Eliminates context switching across Trello, Toggl, QuickBooks, Excel, Zerodha/Groww, and tax filing calculators.
- **Privacy & Local Ownership**: Runs locally with a fast, zero-maintenance SQLite database; user data never leaves their local machine unless cloud backups are explicitly configured.
- **Zero Hardcoding**: All tax regimes, currencies, categories, depreciation models, invoice layouts, and billing rates are 100% data-driven and configurable via system settings.
- **Minimalist & Clean Experience**: Distraction-free, typography-focused, ultra-responsive UI adhering to modern design principles with subtle interactions and dark/light modes.

---

## 3. User Personas

### Persona A: The Independent Consultant / Freelance Developer
- **Needs**: Accurate time tracking tied to client projects, automated generation of professional invoices with custom tax rates, tracking client payment status, and logging project-related business expenses.
- **Pain Points**: Re-entering tracked hours into separate invoicing software; managing separate spreadsheets for quarterly estimated taxes.

### Persona B: The Agency Founder / Solopreneur
- **Needs**: Tracking project milestones, multi-currency revenue streams, hardware and software license assets, cash reserves, and overall business P&L.
- **Pain Points**: Expensive monthly SaaS subscriptions that lock up data and don't integrate Indian tax and wealth accounting.

### Persona C: The Wealth & Tax-Conscious Professional
- **Needs**: Holistic snapshot of liquid vs. fixed net worth, asset depreciation write-offs for tax savings, accurate Indian Income Tax (ITR) computation, and annual regime comparisons.
- **Pain Points**: Complex tax calculators detached from actual yearly income and expenses; scattered investment dashboards.

---

## 4. Pillar Breakdown & Feature Ecosystem

```
+-------------------------------------------------------------------------+
|                               MANAGER X                                 |
+-------------------------------------------------------------------------+
|  OPERATIONAL DOMAIN                  |  FINANCIAL & WEALTH DOMAIN       |
|  - Project Manager                   |  - Finance Manager (Cashflow)    |
|  - Time Tracker                      |  - Asset & Depreciation Manager  |
|  - Invoice Generator                 |  - ITR & Tax Optimization Helper |
|                                      |  - Wealth & Portfolio Manager    |
+-------------------------------------------------------------------------+
|                  CORE ENGINE & ZERO HARDCODING LAYER                    |
|  - Dynamic Schema / Configuration Tables / System Preference Engine     |
|  - SQLite (WAL Mode) + FastAPI Backend + Next.js App Router Frontend   |
+-------------------------------------------------------------------------+
```

### Pillar 1: Project Management
- Dynamic boards (Kanban, List, Milestone Gantt).
- Client association, hourly/fixed-fee budget tracker, task dependencies.
- Custom priorities, tags, statuses, and custom metadata fields.

### Pillar 2: Time Tracking
- Real-time stopwatch and manual timesheet entry.
- Direct linking: Client -> Project -> Milestone -> Task.
- Billable vs. non-billable designation with configurable default hourly rates per client/project.

### Pillar 3: Invoice Generation
- One-click invoice generation from unbilled time entries and milestone deliverables.
- Configurable invoice layouts, headers, client GSTIN/tax IDs, terms, payment instructions, and QR codes (UPI/Bank Details).
- Multi-currency support with dynamic FX conversion rates.
- Status workflow: `Draft` -> `Issued` -> `Partially Paid` -> `Paid` -> `Overdue` -> `Void`.

### Pillar 4: Finance Management
- Multi-account double-entry or simplified ledger (Bank Accounts, Credit Cards, Cash, Escrow).
- Automated recurring expenses, subscription management, category hierarchies.
- Income vs. Expense analysis, P&L reporting, and operating cash burn.

### Pillar 5: Asset Management
- Physical assets (Laptops, monitors, vehicles, office gear) and intangible assets (Software licenses, domain renewals).
- Automatic depreciation engine: Straight Line Method (SLM) & Written Down Value (WDV) compliant with IT/Companies Act rules.
- Purchase invoices, warranty expiry alerts, and salvage value calculation.

### Pillar 6: ITR Helper (Income Tax Return & Planning)
- Financial Year (FY / AY) dynamic configuration engine.
- Comparison between tax regimes (e.g., Old vs. New Regime for India, expandable to other jurisdictions).
- Income aggregation across Salary/Consulting (Business/Profession - 44ADA/Presumptive), Capital Gains (STCG/LTCG), and Other Sources.
- Deductions ledger (Chapter VI-A: 80C, 80D, 80CCD, 80G, HRA, Home Loan Interest).
- Advance tax schedules and quarterly payment reminders.

### Pillar 7: Wealth Management
- Consolidated Net Worth dashboard with historical progression curves.
- Multi-asset class support: Equities, Mutual Funds, Fixed Deposits, Provident Funds (EPF/PPF), Real Estate, Gold/Sovereign Gold Bonds, Crypto, Liquid Cash.
- Target asset allocation vs. actual allocation rebalancing calculator.

---

## 5. Non-Negotiable Design Constants
1. **Minimal & Clean UI**: Monochromatic base, typography-driven hierarchy (Inter / Outfit / JetBrains Mono for numbers), generous whitespace, glassmorphism cards, zero visual clutter.
2. **Zero Hardcoded Values**:
   - Currencies, tax slabs, category trees, invoice formats, depreciation percentages, and status labels MUST be stored in the database or config tables.
   - Everything is user-editable via the Settings interface.
3. **Local-First & Fast**: Zero lag, SQLite running in WAL (Write-Ahead Logging) mode, sub-50ms API response times.
4. **Export & Portability**: 1-click full JSON/SQLite backup, CSV exports for all ledgers, PDF invoice generation.
