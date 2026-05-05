# External Integrations

**Analysis Date:** 2025-05-05

## APIs & External Services

**Movie aggregation (read-only):**
- **KKPhim (phimapi.com)** — danh sách phim, chi tiết, tìm kiếm, lọc theo category/country/year
  - Base URL: `src/utils/env.ts` → `kkphim = 'https://phimapi.com/'`
  - Gọi qua CORS proxy: `/api/proxy?url=...` (client không gọi trực tiếp)
  - HTTP client: `request<T>()` trong `src/utils/request.ts`
- **NguonC (phim.nguonc.com)** — nguồn phim thứ hai, tương tự
  - Base URL: `src/utils/env.ts` → `nguonc = 'https://phim.nguonc.com/'`
  - Cùng proxy và `request()` pattern

**Auth & DB:**
- **Supabase** — auth + PostgreSQL
  - Client: `src/lib/supabaseClient.ts` (singleton, `persistSession: false`)
  - Auth: signInWithPassword, cookies `sb-access-token` (7d), `sb-refresh-token` (30d)
  - Bảng: `favorite`, `movie_tracking`, `user_notifications`
  - RPC: `notify_movie_updates` (fan-out notification khi có phim mới)
  - Không dùng ORM — `.from('favorite').select()`, `.insert()`, `.delete()`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) — favorites; connection qua env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**File Storage:**
- Local filesystem chỉ cho source và build; ảnh phim từ URL bên ngoài (KKPhim, NguonC)

**Caching:**
- TanStack Query (in-memory, client)
- Watch history: localStorage (30-day TTL, max 50 entries) — `src/utils/local-storage.ts`

## Authentication & Identity

**Auth Provider:** Supabase Auth
- Implementation: HTTP-only cookies; server Route Handlers set cookie sau login (`src/app/api/auth/login/route.ts`)
- Server: `getUserId(req)` từ `src/lib/auth-helper.ts` (đọc cookie, `supabase.auth.getUser(access_token)`)
- Client: `AuthProvider` + `useAuth()` trong `src/app/auth-provider.tsx`; `/api/auth/me` để sync user

## Monitoring & Observability

**Error Tracking:** None

**Logs:** `console.error` / `console.warn` tại API routes và một số component (e.g. `src/component/player/custom-player.tsx`)

## CI/CD & Deployment

**Hosting:** Vercel (Frontend + BFF)

**Background Jobs:** Cloudflare Workers (Cronjob `0 * * * *` check phim mới)

**CI Pipeline:** Not detected trong repo (no GitHub Actions / workflow files)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

**Secrets location:** Vercel dashboard hoặc `.env.local` (không commit)

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:** Chỉ HTTP GET (và POST cho auth/favorite) tới Supabase và proxy fetch tới KKPhim/NguonC

---

*Integration audit: 2025-05-05*
