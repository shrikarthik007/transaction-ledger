# Transaction Ledger — Full Stack Application

A full-stack **Transaction Ledger** application with a RESTful API backend and a modern React dashboard frontend. Supports account management, credit/debit transactions, balance tracking, transaction history with filtering/pagination, and atomic money transfers.

![Tech Stack](https://img.shields.io/badge/Node.js-Express-green) ![React](https://img.shields.io/badge/React-TypeScript-blue) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-cyan)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (React)                    │
│          Vite + TypeScript + Tailwind CSS             │
│                  Deployed on Netlify                  │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP (REST API)
┌──────────────────▼───────────────────────────────────┐
│                  Backend (Express.js)                 │
│            Node.js + TypeScript + Zod                 │
│                  Deployed on Render                   │
└──────────────────┬───────────────────────────────────┘
                   │ Supabase Client (service_role)
┌──────────────────▼───────────────────────────────────┐
│               Database (Supabase/PostgreSQL)          │
│      Tables + RPC Functions + RLS + Constraints       │
└──────────────────────────────────────────────────────┘
```

## ✨ Features

### Core (Assignment Requirements)
- ✅ **Create Account** — unique UUID, required name, balance starts at 0
- ✅ **Add Transaction** — credit/debit with atomic balance updates
- ✅ **Duplicate Detection** — reference_id uniqueness scoped per account
- ✅ **Get Account Balance** — real-time balance retrieval
- ✅ **Transaction History** — filtering by type, pagination, latest-first sorting
- ✅ **Data Integrity** — PostgreSQL functions ensure atomicity
- ✅ **Transaction Immutability** — no update/delete endpoints
- ✅ **Validation** — Zod schemas for all inputs
- ✅ **Error Handling** — consistent error responses with proper HTTP status codes

### Bonus
- ✅ **Money Transfer** — atomic transfer between accounts with deadlock prevention
- ✅ **Frontend Dashboard** — React UI with account management, transaction forms, and transfer modal

### Extra Mile
- 🎨 **Modern UI** — Tailwind CSS with polished design
- 📊 **Dashboard Stats** — total balance, account count, average balance
- 🔍 **Filtering & Pagination** — built into the UI
- 🟢 **Color-coded Transactions** — green for credit, red for debit
- 📱 **Responsive Design** — works on mobile and desktop
- 🔔 **Toast Notifications** — success/error feedback
- 📝 **Self-documenting API** — `/api/docs` endpoint

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (tested on v20)
- **npm** v9+
- A Postgres database with a PostgREST API — either a hosted **Supabase** project ([supabase.com](https://supabase.com)) or the **local Supabase CLI stack** (Docker required)
- **Docker** only if you use the local stack

### 1. Clone the Repository
```bash
git clone <repository-url>
cd transaction-ledger
```

### 2. Set Up Supabase Database

You have two options — a hosted Supabase project, or a fully local stack (no account needed).

#### Option A: Local Supabase (no cloud account, easiest)

Requires Docker Desktop to be running.

```bash
# from the repository root
npx supabase start      # boots Postgres + PostgREST in Docker
```

The schema in `database/schema.sql` is applied automatically on first start (wired up via `supabase/config.toml` → `[db.seed]`). `supabase start` prints the local API URL and keys; copy them into `backend/.env`:

```
PORT=3000
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key printed by `supabase start`>
FRONTEND_URL=http://localhost:5173
```

Useful commands:

| Command | Purpose |
|---------|---------|
| `npx supabase status` | Show URLs and keys of the running stack |
| `npx supabase db reset` | Drop and re-apply `database/schema.sql` (clean slate) |
| `npx supabase stop` | Shut the stack down |

If you already have a running stack from a previous session, skip `supabase start` and just run `npx supabase status`.

#### Option B: Hosted Supabase project

Create a new project at [supabase.com](https://supabase.com) and run the following SQL in the SQL Editor:

```sql
-- Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL CHECK (char_length(name) > 0),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  reference_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, reference_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_type ON public.transactions(account_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(account_id, created_at DESC);
```

Then create the atomic RPC functions (see `database/schema.sql` for the full SQL including `create_transaction` and `transfer_funds` functions). Easiest: paste the whole `database/schema.sql` file into the SQL Editor and run it once.

> **Note:** the SQL above is a summary. `database/schema.sql` is the single source of truth — it also creates the RPC functions and RLS policies, and it's safe to re-run on an existing database.

### 3. Set Up Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

### 4. Set Up Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API calls to the backend.

### 5. Run the Tests

The repository ships an end-to-end smoke test that exercises every requirement in the assignment — including concurrency, duplicate handling, pagination, and the bonus transfer.

With the backend running (`npm run dev` or `npm start` in `backend/`):

```bash
node tests/smoke.test.mjs
```

It prints one line per assertion and exits non-zero on any failure. To point it elsewhere:

```bash
# Windows PowerShell
$env:BASE_URL="http://localhost:3000/api"; node tests/smoke.test.mjs

# macOS / Linux
BASE_URL=http://localhost:3000/api node tests/smoke.test.mjs
```

> The test creates real accounts and transactions in the configured database. Use the local stack (`npx supabase db reset` afterwards) if you don't want the data in a hosted project.


---

## 📡 API Documentation

Base URL: `http://localhost:3000/api`

Interactive docs available at: `GET /api/docs`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/accounts` | Create account |
| `GET` | `/api/accounts` | List all accounts |
| `GET` | `/api/accounts/:id` | Get account details |
| `GET` | `/api/accounts/:id/balance` | Get account balance |
| `POST` | `/api/accounts/:id/transactions` | Add transaction |
| `GET` | `/api/accounts/:id/transactions` | Get transaction history |
| `POST` | `/api/transfers` | Transfer between accounts |

### Example: Create Account
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "balance": 0,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Example: Add Transaction
```bash
curl -X POST http://localhost:3000/api/accounts/550e8400.../transactions \
  -H "Content-Type: application/json" \
  -d '{"type": "credit", "amount": 100, "reference_id": "TXN-001", "description": "Initial deposit"}'
```

### Example: Get Transactions with Filtering & Pagination
```bash
curl "http://localhost:3000/api/accounts/550e8400.../transactions?type=credit&page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 25,
    "total_pages": 3
  }
}
```

### Example: Transfer Money
```bash
curl -X POST http://localhost:3000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_account_id": "...",
    "destination_account_id": "...",
    "amount": 50,
    "reference_id": "TRF-001",
    "description": "Payment for services"
  }'
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for account '...'. Available: 100, Requested: 150"
  }
}
```

---

## 🛡️ Data Integrity

### Atomicity
All balance-affecting operations use **PostgreSQL functions** executed as single transactions:
- `create_transaction()` — atomically inserts a transaction and updates the account balance
- `transfer_funds()` — atomically debits source, credits destination, and updates both balances

### Deadlock Prevention
The `transfer_funds()` function locks accounts in **consistent UUID order** to prevent deadlocks during concurrent transfers.

### Constraints
- `CHECK (balance >= 0)` — prevents negative balances at the database level
- `CHECK (amount > 0)` — ensures positive transaction amounts
- `UNIQUE (account_id, reference_id)` — prevents duplicate transactions per account
- `ON DELETE RESTRICT` — prevents deleting accounts with transactions

---

## 📁 Project Structure

```
transaction-ledger/
├── backend/
│   ├── src/
│   │   ├── config/          # Supabase client configuration
│   │   ├── middleware/       # Error handler, validation middleware
│   │   ├── routes/           # Express route handlers
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # Business logic layer
│   │   ├── utils/            # Error utilities
│   │   ├── app.ts            # Express app setup
│   │   └── index.ts          # Server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # API client, utilities
│   │   ├── pages/            # Page components
│   │   ├── App.tsx           # Router setup
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Tailwind + component styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── database/
│   └── schema.sql            # Full database schema + functions
├── supabase/
│   └── config.toml           # Local stack config (seeds database/schema.sql)
├── tests/
│   └── smoke.test.mjs        # End-to-end API smoke test
└── README.md
```

---

## 🔮 Assumptions

1. Account IDs are UUIDs generated server-side
2. Initial balance is always 0 and cannot be set by the client
3. `reference_id` uniqueness is scoped per account — the same reference_id can be used for different accounts
4. Transaction amounts are stored with 2-decimal precision (NUMERIC(15,2))
5. Transactions are immutable — no update or delete endpoints exist
6. Balance updates and transaction creation are atomic via PostgreSQL functions
7. Transfers create two linked transactions (debit on source, credit on destination)
8. All timestamps are in ISO 8601 UTC format
9. Pagination defaults: page=1, limit=10, max limit=100
10. Transaction history is always sorted by `created_at` descending (latest first)

---

## 🚢 Deployment

### Backend (Render)
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your Git repository
3. Set build command: `cd backend && npm install && npm run build`
4. Set start command: `cd backend && npm start`
5. Add environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL)

### Frontend (Netlify)
1. Create a new site on [netlify.com](https://netlify.com)
2. Connect your Git repository
3. Set base directory: `frontend`
4. Set build command: `npm run build`
5. Set publish directory: `frontend/dist`
6. Add `_redirects` file for SPA routing: `/* /index.html 200`

---

## 📄 License

Built as part of a technical assessment.

