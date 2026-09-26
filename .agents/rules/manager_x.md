# Manager X Project Rules & Invariants

## 1. Identifiers & Primary Keys
- **All input and entity identifiers must be CUID** (`Collision-resistant Unique Identifiers`).
- In Python/backend, use `app.core.cuid.generate_cuid` (prefix-based, timestamp-ordered, URL-friendly).
- Avoid UUID4 or auto-incrementing integers for entity primary keys or external ID inputs.

## 2. Referential Deletion Protection
- **No deletion if already in use**: Any master data, lookup item, or configuration record (Currencies, Clients, Tax Schemes, Accounts, Categories, Projects, Tasks, etc.) **CANNOT be deleted if it is already referenced or in use** in transactions, logs, invoices, or other dependent records.
- Deletions of in-use records must be blocked with an HTTP 400 Bad Request error indicating that the item is currently in use.
- Records should be deactivated (`is_active = False`) instead of deleted.

## 3. Currencies & Exchange Rates
- Currency definitions only store metadata (`code`, `symbol`, `name`, `is_base_currency`, `is_active`).
- **No static "Exchange Rate to Base"**: FX rates are dynamic and determined at invoice/transaction execution time, not stored as a static currency definition property.

## 4. Automatic Git Version Control
- **Commit on every single code change**: Every time code files are created, modified, or refactored, automatically stage (`git add .`) and commit with a conventional commit message (`feat(...)`, `fix(...)`, `refactor(...)`).
- Do not wait for the user to prompt for a commit. Automatic version control must be executed after verifying changes.

## 5. Modal Backdrop Dismissal Protection (Form & Data Safety)
- **Never dismiss on backdrop/outside click**: All creation, editing, and configuration dialogs (e.g. `ClientModal`, `SettingsModal`, project modals, invoice forms) must NEVER close when clicking on the outside overlay/backdrop.
- Users frequently enter extensive form inputs (multi-field addresses, commercial terms, financial parameters). Outside clicks must be ignored to prevent accidental loss of unsaved input.
- Modals must only close via explicit user actions: the pinned "X" close button, the "Cancel" button, or upon successful form submission.

