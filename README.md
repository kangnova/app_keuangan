# 💰 Duitku — Personal Finance Tracker

A full-featured personal finance application for tracking daily expenses, account balances, and generating periodic reports — powered by **AI receipt scanning** via [Sumopod AI Gateway](https://sumopod.com) with export to HTML/PDF/Excel.

> 📋 Full project roadmap available in [`RENCANA.md`](./RENCANA.md).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Prisma 6** + SQLite (production-ready for PostgreSQL migration)
- **Recharts** (visualization) · **ExcelJS** (.xlsx export) · **pdfmake 0.2** (PDF export)
- **AI Receipt Scan**: Sumopod AI Gateway (OpenAI-compatible, `openai` SDK)

## Milestone Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation: Next.js + TS + Prisma + DB schema + seed | ✅ |
| 2 | CRUD Accounts, Transactions (income/expense/transfer), Categories, **Debt Tracking** | ✅ |
| 3 | Dashboard + 4-period Reports + charts + **Export Excel/PDF/HTML** | ✅ |
| 4 | AI Receipt Scan via Sumopod + review flow | ✅ *(requires API key)* |
| 5 | Export HTML / PDF / Excel | 🔜 |
| 6 | PWA + passcode + UI polish | 🔜 |
| 7 | Docker + Sumopod Container deploy | 🔜 |

## Quick Start

```bash
# 1. Install dependencies (auto-generates Prisma Client via postinstall)
npm install

# 2. Setup database (creates prisma/dev.db + runs seed)
npx prisma migrate dev
npm run db:seed

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> 📷 **Enable AI Receipt Scan**: add `SUMOPOD_API_KEY` to `.env` (Sumopod dashboard → AI Models). Without an API key, set `SCAN_MOCK_MODE=1` to test the scan flow with mock data.

### Database Commands

```bash
npm run db:migrate   # create/run new migrations
npm run db:seed      # seed preset categories + sample accounts (idempotent)
npm run db:studio    # open Prisma Studio (database GUI)
```

### Smoke Test API (82 end-to-end assertions)

```bash
rm -f prisma/test.db && DATABASE_URL="file:./test.db" npx prisma migrate deploy
DATABASE_URL="file:./test.db" npm run db:seed
DATABASE_URL="file:./test.db" npx next start -p 3111 &   # in separate terminal
node scripts/smoke.mjs
```

## Key Architecture Decisions

- 💵 **All monetary values = integer rupiah** (no decimals) — eliminates rounding bugs.
- 🧮 **Account balances are never stored** — always computed from transactions
  (`initialBalance + income - expense ± transfer`) — zero drift guarantee.
- 🤖 **AI never mutates balances directly** — all scanned receipts require user review before becoming transactions.
- ⚖️ **Debt tracked separately** (`Debt` model) — debt payments (`DEBT_PAYMENT`) reduce account balance but **exclude from daily expenses**; disbursements (`DEBT_DISBURSEMENT`) increase balance but aren't income. Remaining principal = `initialAmount + Σ manual disbursements − Σ payments`. New debt with `moneyReceived: true` auto-creates `source: "DEBT_OPENING"` transaction (increases balance, no double-count in principal).
- 🧪 **PATCH APIs are partial** — omitted fields never change.

## Environment Variables

See `.env.example`. For AI features (Milestone 4):

```env
SUMOPOD_API_KEY="sk-... from sumopod dashboard"
SUMOPOD_BASE_URL="https://ai.sumopod.com/v1"
SUMOPOD_VISION_MODEL="gpt-4o-mini"   # or gpt-4o / gemini-2.5-flash
SCAN_MOCK_MODE="0"                    # 1 = demo without AI calls (UI testing)
```

---

## Why This Project Matters

**Duitku** demonstrates production-grade full-stack engineering:

- **Type-safe end-to-end**: TypeScript + Prisma + Zod validation
- **AI integration**: Real-world LLM vision model usage with fallback/mock modes
- **Financial correctness**: Integer-only arithmetic, computed balances, audit trails
- **Testing discipline**: 82-assertion smoke test covering auth, CRUD, reports, exports
- **Deploy-ready**: Docker-friendly, PostgreSQL migration path, env-driven config
- **Modern stack**: Next.js 16 App Router, Tailwind v4, Prisma 6

Built to showcase skills relevant for **remote Full Stack / Backend roles** — clean architecture, financial domain modeling, AI integration, and testable code.

---

*Open to remote opportunities. Let's connect: [LinkedIn](https://linkedin.com) • [GitHub](https://github.com)*