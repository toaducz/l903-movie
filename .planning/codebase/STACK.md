# Technology Stack

**Analysis Date:** 2025-03-08

## Languages

**Primary:**
- TypeScript (strict mode) — toàn bộ `src/`, cấu hình trong `tsconfig.json`

**Secondary:**
- JavaScript — config (`.prettierrc.js`, `postcss.config.mjs`, `eslint.config.mjs`)

## Runtime

**Environment:**
- Node.js (implied by Next.js 15; không khóa version trong `.nvmrc` hoặc `.node-version`)

**Package Manager:**
- pnpm
- Lockfile: `pnpm-lock.yaml` (present khi đã chạy `pnpm install`)

## Frameworks

**Core:**
- Next.js 15.5.9 — App Router, Route Handlers (BFF), không dùng Pages Router
- React 19.1.1 — UI

**Testing:**
- Not detected — không có Jest, Vitest hay Testing Library trong `package.json` hoặc config

**Build/Dev:**
- Next.js built-in (Turbopack/SWC) — build và dev server
- PostCSS + Tailwind CSS v4 — styling
- ESLint 9 + eslint-config-next — lint

## Key Dependencies

**Critical:**
- `@tanstack/react-query` ^5.90.2 — server state, queryOptions + useQuery pattern
- `@supabase/supabase-js` ^2.58.0 — auth + PostgreSQL (favorite, user)
- `next` 15.5.9 — routing, API routes, SSR/CSR

**Video:**
- `video.js` ^8.23.7 — player chính
- `videojs-contrib-quality-levels` ^4.1.0 — HLS quality levels
- `videojs-hls-quality-selector` ^2.0.0 — UI chọn chất lượng
- `hls.js` ^1.6.5 — HLS (qua video.js)
- `react-player` ^2.16.0 — dùng ở một số màn hình

**UX:**
- `nprogress` ^0.2.0 — progress bar điều hướng

## Configuration

**Environment:**
- Biến môi trường qua `.env.local` hoặc Vercel; không commit `.env`
- Cần: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Build:**
- `next.config.ts` — security headers (X-Frame-Options, X-XSS-Protection, HSTS, …)
- `tsconfig.json` — strict, path `@/*` → `./src/*`
- `postcss.config.mjs` — Tailwind
- `eslint.config.mjs` — flat config, extends `next/core-web-vitals`, `next/typescript`

## Platform Requirements

**Development:**
- Node.js (khuyến nghị LTS tương thích Next 15)
- pnpm

**Production:**
- Vercel (theo CLAUDE.md); có thể chạy `next start` trên bất kỳ Node host nào

---

*Stack analysis: 2025-03-08*
