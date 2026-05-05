# Codebase Structure

**Analysis Date:** 2025-05-05

## Directory Layout

```
L903-Movie/
├── src/
│   ├── api/              # TanStack Query queryOptions + types (KKPhim, NguonC)
│   ├── app/              # App Router: layouts, pages, API routes
│   │   ├── api/          # Route Handlers: proxy, auth, favorite, notifications
│   │   ├── auth-provider.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── provider.tsx
│   │   ├── detail-movie/[slug]/
│   │   ├── search/, list-movie/, all-movie/, login/, profile/, nguonc/
│   │   └── error.tsx, not-found.tsx
│   ├── component/        # Reusable UI (navbar, footer, player, item, status, pagination, …)
│   ├── lib/              # Supabase client, auth-helper (server)
│   ├── page/             # Page-level client components (search-result, movie-list, …)
│   ├── types/            # Type declarations (e.g. videojs-hls-quality-selector.d.ts)
│   └── utils/            # request, env, mapping, local-storage
├── public/               # Static assets
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── .prettierrc.js
└── package.json
```

## Directory Purposes

**`src/api/`:**
- Purpose: Định nghĩa cách lấy dữ liệu phim (queryOptions) và types
- Contains: `kkphim/` (get-detail-movie, get-update-movie, get-list-movie, search, list-movie, filter), `nguonc/` (tương tự), `pagination.tsx`
- Key files: `src/api/kkphim/get-detail-movie.tsx`, `src/api/kkphim/get-update-movie.tsx`, `src/utils/request.ts`, `src/utils/env.ts`

**`src/app/`:**
- Purpose: Routes (pages + layouts) và BFF (api/)
- Contains: `layout.tsx`, `page.tsx`, `auth-provider.tsx`, `provider.tsx`, thư mục route (detail-movie, search, list-movie, profile, nguonc, …), `api/proxy`, `api/auth/*`, `api/favorite/*`, `api/notifications/*`
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/proxy/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/favorite/route.ts`, `src/app/api/notifications/route.ts`

**`src/component/`:**
- Purpose: Component UI tái sử dụng
- Contains: navbar, footer, player (custom-player), episode-list, item (movie-item, movie-rank-item, profile-movie-items), status (loading, error, warning), pagination, filter, favorite-button, notification-bell, NProgressInit
- Key files: `src/component/player/custom-player.tsx`, `src/component/item/movie-item.tsx`, `src/component/layout/notification-bell.tsx`

**`src/lib/`:**
- Purpose: Singleton và helper server-side
- Contains: `supabaseClient.ts`, `auth-helper.ts`
- Key files: `src/lib/supabaseClient.ts`, `src/lib/auth-helper.ts`

**`src/page/`:**
- Purpose: Page-level client components dùng trong app routes
- Contains: search-result-page, movie-list-page, all-movie-page, nguonc/search/search-result-page-nguonc
- Key files: `src/page/search-result-page.tsx`, `src/page/movie-list-page.tsx`

**`src/utils/`:**
- Purpose: HTTP client, env constants, mapping API → UI, localStorage helpers
- Contains: `request.ts`, `env.ts`, `mapping.ts`, `local-storage.ts`
- Key files: `src/utils/request.ts`, `src/utils/env.ts`, `src/utils/local-storage.ts`

**`src/types/`:**
- Purpose: Khai báo TypeScript cho thư viện không type (e.g. plugin videojs)
- Key files: `src/types/videojs-hls-quality-selector.d.ts`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` — root layout, providers, Navbar/Footer
- `src/app/page.tsx` — home
- `src/app/provider.tsx` — QueryClientProvider

**Configuration:**
- `next.config.ts` — security headers
- `tsconfig.json` — strict, path `@/*` → `src/*`
- `eslint.config.mjs` — ESLint flat config
- `.prettierrc.js` — single quotes, no semi, 120 width, 2 spaces

**Core Logic:**
- `src/utils/request.ts` — gọi API qua proxy
- `src/app/api/proxy/route.ts` — CORS proxy
- `src/lib/auth-helper.ts` — getUserId từ cookie
- `src/component/player/custom-player.tsx` — video.js + HLS quality, phím tắt, ad skip

**Testing:**
- Not present — không có thư mục test hay config Jest/Vitest

## Naming Conventions

**Files:**
- Component/page: kebab-case hoặc camelCase (e.g. `custom-player.tsx`, `search-result-page.tsx`)
- API modules: get-detail-movie, get-update-movie, get-list-movie, get-search (kkphim/nguonc)
- Route Handlers: `route.ts` trong thư mục tương ứng path

**Directories:**
- `detail-movie/[slug]`, `list-movie/category`, `api/auth/login`, `api/favorite/check` — theo App Router và chức năng

## Where to Add New Code

**New feature (movie source / page):**
- QueryOptions + types: `src/api/kkphim/` hoặc `src/api/nguonc/` (hoặc thư mục mới dưới `src/api/`)
- Page: `src/app/<route>/page.tsx`; có thể dùng component trong `src/page/` nếu dùng lại
- Component: `src/component/` (theo domain: item, filter, …)

**New API route (BFF):**
- Thêm `src/app/api/<tên>/route.ts`; dùng `getUserId(req)` nếu cần auth; dùng `src/lib/supabaseClient.ts` nếu cần DB

**Utilities:**
- Shared helpers: `src/utils/` (request, env, mapping, local-storage)
- Type declarations: `src/types/`

**New component:**
- Reusable UI: `src/component/` (có thể tạo subfolder: component/player/, component/item/)

## Special Directories

**`src/app/api/`:**
- Purpose: Next.js Route Handlers (BFF)
- Generated: No
- Committed: Yes

**`public/`:**
- Purpose: Static files
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Build output
- Generated: Yes (by `next build`)
- Committed: No (thường trong .gitignore)

---

*Structure analysis: 2025-05-05*
