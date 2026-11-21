# MandiMart Pro

Local-first mandi ERP (Expo/React Native, on-device SQLite) + licensing backend (Supabase) + admin web (Vite/React).

```
apps/mobile      customer Android app (expo-router, expo-sqlite)
apps/admin       admin dashboard (Vite + React + Tailwind)
packages/shared  money/FY/licence/zod/theme (tested)
supabase         migrations + edge functions
```

## Run
```
npm install
npm test                       # shared + mobile data-layer tests
npm run dev -w @mandimart/admin
npm run start -w @mandimart/mobile
```
Copy `.env.example` → set Supabase URL/anon key. See `docs/DEPLOY.md`.

## Status
Phase 1–4 done (foundation, SQLite ledger + tests, licensing backend, admin web, mobile register/pay/lock + core entry screens).
Pending: slips designer, reports, backup/restore, PIN lock, i18n, recycle-bin UI, Maestro/Playwright E2E, Sentry, pgTAP RLS tests.
