# AI Subtitle Generator

Production SaaS app for fast, reliable subtitle generation. Built on top of an existing FastAPI + Deepgram backend living at `/root/subtitle_api`.

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS v4** with design tokens from `DESIGN.md`
- **Supabase** — auth, Postgres, storage (Phase 1, 2)
- **Prisma** — schema + migrations (Phase 2)
- **Stripe** — billing (Phase 3)
- **PostHog** — analytics (Phase 5)
- **Sentry** — error tracking (Phase 6)
- **Resend** — transactional email (Phase 7)
- **Playwright** — E2E tests (Phase 10)

## Local development

```bash
cp .env.example .env.local
# fill in real keys from Supabase, Stripe, etc.
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint via `next lint` |

## Deployment

FastHosts VPS, Ubuntu 22.04. Served by Nginx in front of PM2 on port 3000. Domain `aisubtitle.online`. Production env lives only in `/root/subtitle_web/.env.production` on the VPS (gitignored).

## Project context

- [`PRODUCT.md`](./PRODUCT.md) — product strategy (audience, anti-references, design principles).
- [`DESIGN.md`](./DESIGN.md) — visual system ("The Subtitle Control Room") with tokens, components, do/don't.
- [`.impeccable/design.json`](./.impeccable/design.json) — machine-readable sidecar of the same system.
