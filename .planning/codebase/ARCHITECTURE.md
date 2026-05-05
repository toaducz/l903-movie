# Architecture

**Analysis Date:** 2025-05-05

## Pattern Overview

**Overall:** Next.js App Router SPA-style với BFF (Route Handlers), client-first rendering, CORS proxy cho API bên ngoài.

**Key Characteristics:**
- Toàn bộ page là client components (`'use client'`); không dùng SSR/SSG cho nội dung phim
- Mọi gọi API phim bên ngoài đi qua proxy `/api/proxy?url=...` để tránh CORS
- Server state: TanStack React Query; auth: React Context + HTTP-only cookies
- Persistence: Supabase (favorites), localStorage (watch history)

## Layers

**UI (Pages & Components):**
- Purpose: Màn hình và component tái sử dụng
- Location: `src/app/` (routes + layouts), `src/page/` (page-level client components), `src/component/`
- Contains: Client components, `useQuery(queryOptions(...))`, navigation, forms
- Depends on: `@/api/*` (queryOptions), `@/component/*`, `@/utils/*`, `@/lib/*`
- Used by: User (browser)

**API / Data layer (client):**
- Purpose: Định nghĩa queryOptions và types cho TanStack Query, không gọi API trực tiếp từ component
- Location: `src/api/` — `src/api/kkphim/`, `src/api/nguonc/`, `src/api/pagination.tsx`
- Contains: `queryOptions()`, types (DetailMovie, Movie, …), gọi `request()` với base URL từ `src/utils/env.ts`
- Depends on: `@/utils/request`, `@/utils/env`
- Used by: Pages và components qua `useQuery(module.queryOptions(...))`

**BFF (Route Handlers):**
- Purpose: Proxy CORS, auth (login/logout/me), favorites CRUD, notifications
- Location: `src/app/api/` — `proxy/route.ts`, `auth/login`, `auth/logout`, `auth/me`, `favorite/route.ts`, `favorite/check/route.ts`, `notifications/route.ts`
- Contains: GET/POST/DELETE/PUT handlers, Supabase client, cookie read/set, `getUserId(req)`
- Depends on: `src/lib/supabaseClient.ts`, `src/lib/auth-helper.ts`
- Used by: Client fetch (form action, `useAuth`, favorite buttons, proxy từ `request()`)

**Shared / lib:**
- Purpose: Supabase singleton, auth helper (server), env constants
- Location: `src/lib/`, `src/utils/`
- Contains: `supabaseClient.ts`, `auth-helper.ts`, `request.ts`, `env.ts`, `mapping.ts`, `local-storage.ts`
- Depends on: Next/server, Supabase SDK, browser APIs (localStorage) where applicable
- Used by: API routes, api modules, components

## Data Flow

**Movie list/detail (read):**
1. Component gọi `useQuery(getDetailMovie({ slug }))` (hoặc tương tự cho list/search)
2. Query fn gọi `request<T>(kkphim, endpoint, 'GET')`
3. `request()` build URL và gọi `/api/proxy?url=...` (same-origin)
4. Route Handler proxy fetch target URL, trả JSON
5. TanStack Query cache và trả data cho component

**Auth:**
1. Login: POST `/api/auth/login` với email/password → Supabase signInWithPassword → set HTTP-only cookies → redirect/response
2. Client: `AuthProvider` gọi `/api/auth/me` → server đọc cookie, trả user → setUser
3. Protected actions (favorite): Route Handlers gọi `getSession(req)` + `getUserId(req)`; 401 nếu không có token

**Favorites:**
1. GET/POST/DELETE `/api/favorite` → getSession + getUserId → Supabase `.from('favorite')` → JSON response
2. Client dùng fetch hoặc mutation (TanStack Query) tùy trang

**State Management:**
- Server state: TanStack Query (queryKey từ api modules)
- Auth: React Context (`AuthProvider`, `useAuth()`)
- Watch history: localStorage (helper trong `src/utils/local-storage.ts`)

**Notifications (Fan-out on Write):**
1. Cronjob (Cloudflare Worker) chạy mỗi giờ: fetch API KKPhim -> bulk upsert vào `movie_tracking` (Supabase).
2. Worker gọi RPC `notify_movie_updates` trên Supabase truyền danh sách phim mới.
3. Supabase RPC dùng `UNION` gộp `favorite` và `watch_history` để insert hàng loạt vào `user_notifications`.
4. Client component `NotificationBell` dùng `useQuery` gọi `GET /api/notifications` để hiển thị và `PUT /api/notifications` để mark-as-read.

## Key Abstractions

**request<T>(apiUrl, endpoint, method, payload?):**
- Purpose: Gọi API bên ngoài qua proxy, trả về JSON typed
- Location: `src/utils/request.ts`
- Pattern: Luôn build proxy URL; GET params trong query string; parse JSON hoặc null

**queryOptions() per API:**
- Purpose: Chuẩn hóa key + queryFn cho useQuery
- Examples: `src/api/kkphim/get-detail-movie.tsx`, `src/api/kkphim/get-update-movie.tsx`, `src/api/nguonc/get-detail-movie.tsx`
- Pattern: Export `queryOptions({ queryKey: [...], queryFn: () => request<T>(base, path, 'GET') })`

**getUserId(req):**
- Purpose: Lấy user id từ cookie trên server
- Location: `src/lib/auth-helper.ts`
- Pattern: Đọc `sb-access-token`, `supabase.auth.getUser(access_token)` → return id hoặc null

## Entry Points

**App root:**
- Location: `src/app/layout.tsx`
- Triggers: Mọi request
- Responsibilities: Fonts, globals.css, QueryProvider, AuthProvider, Navbar, Footer, NProgressInit

**Route Handlers:**
- Location: `src/app/api/**/route.ts`
- Triggers: Client fetch tới `/api/proxy`, `/api/auth/*`, `/api/favorite*`
- Responsibilities: Proxy, auth, favorites CRUD, set cookies

**Pages:**
- Location: `src/app/**/page.tsx` (App Router)
- Triggers: Navigation
- Responsibilities: Render client components (home, detail, search, list-movie, profile, nguonc/*, …)

## Error Handling

**Strategy:** Trả JSON lỗi từ API routes (status 400/401/500); client hiển thị trạng thái (Loading, Error components) dựa trên `isLoading`, `isError` từ useQuery hoặc response status.

**Patterns:**
- Proxy: thiếu `url` → 400
- Auth: không token / session lỗi → 401; thiếu slug → 400
- Supabase lỗi → 500, `console.error`, JSON `{ error: message }`
- `request()`: catch JSON parse → return null (caller phải handle null)

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` trong API routes và một số component; không có logger tập trung.

**Validation:** Kiểm tra thủ công trong Route Handlers (slug, body); không dùng schema lib (Zod/Vali).

**Authentication:** Cookie-based; Route Handlers dùng `getSession(req)` + `getUserId(req)`; client dùng `useAuth()`.

---

*Architecture analysis: 2025-05-05*
