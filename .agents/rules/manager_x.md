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
