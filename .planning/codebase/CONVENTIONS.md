# Coding Conventions

**Analysis Date:** 2025-03-08

## Naming Patterns

**Files:**
- Components/pages: kebab-case hoặc camelCase — e.g. `custom-player.tsx`, `search-result-page.tsx`, `movie-item.tsx`
- Hooks: `use-*.ts` đặt trong `src/hooks/` — e.g. `use-is-mobile.ts`, `use-mark-watched.ts`, `use-finish-from-continue.ts`
- Providers: `*-provider.tsx` đặt trong `src/providers/` — e.g. `auth-provider.tsx`, `query-provider.tsx`, `watched-provider.tsx`
- API modules: kebab-case — e.g. `get-detail-movie.tsx`, `get-list-movie-by-category.tsx`
- Utils/lib: kebab-case hoặc camelCase — e.g. `request.ts`, `auth-helper.ts`, `local-storage.ts`, `supabase-client.ts`
- Route Handlers: luôn `route.ts` trong thư mục tương ứng path

**Functions:**
- camelCase — e.g. `getUserId`, `saveViewHistory`, `getDetailMovie`, `getSession`
- Component: PascalCase — e.g. `VideoPlayer`, `MovieItem`, `AuthProvider`

**Variables:**
- camelCase — e.g. `updateMovie`, `playerRef`, `access_token` (tên từ Supabase/cookie giữ nguyên)
- Hằng: UPPER_SNAKE trong phạm vi file — e.g. `STORAGE_KEY`, `EXPIRE_DAYS` trong `src/utils/local-storage.ts`

**Types:**
- PascalCase — e.g. `DetailMovie`, `Episode`, `AuthContextType`, `VideoPlayerProps`
- Interfaces: PascalCase — e.g. `HLSSegment`, `VHSTech`, `VideoJsPlayerOptions`

## Code Style

**Formatting:**
- Tool: Prettier (config trong `.prettierrc.js`)
- Key settings: single quotes, no semicolons (`semi: false`), 2-space indent (`tabWidth: 2`), 120-char line width (`printWidth: 120`), JSX single quotes (`jsxSingleQuote: true`), trailing comma none (`trailingComma: 'none'`)

**Linting:**
- ESLint 9, flat config trong `eslint.config.mjs`
- Extends: `next/core-web-vitals`, `next/typescript`
- Không custom rule bổ sung trong file đã đọc

## Import Organization

**Order:**
- React / next trước (e.g. `'use client'`, `import React, { ... } from 'react'`, `import { useParams } from 'next/navigation'`)
- Thư viện bên ngoài (e.g. `@tanstack/react-query`, `video.js`)
- Alias nội bộ (`@/api/...`, `@/component/...`, `@/utils/...`, `@/lib/...`)
- Relative chỉ khi cần (e.g. Route Handlers dùng `../../../lib/supabaseClient`)

**Path Aliases:**
- `@/*` → `src/*` (định nghĩa trong `tsconfig.json`)

## Error Handling

**Patterns:**
- API routes: `NextResponse.json({ error: message }, { status: 401|400|500 })`; dùng `console.error` cho lỗi Supabase hoặc parse
- Client: `request()` catch JSON parse → return null; component dựa vào `isError` / `data === null` để hiển thị Error component
- Không dùng try/catch toàn cục; không có error boundary custom ngoài `src/app/error.tsx` (Next mặc định)

## Logging

**Framework:** console (không dùng logger tập trung)

**Patterns:**
- `console.error` trong Route Handlers khi Supabase error hoặc parse fail
- `console.warn` trong component (e.g. player orientation) khi lỗi không chặn luồng
- Không có chuẩn log level hay requestId

## Comments

**When to Comment:**
- Tiếng Việt cho logic nghiệp vụ (e.g. proxy CORS, cookie, ad skip regex, orientation lock)
- Comment code bị tắt (e.g. double-click tua trong player) giữ lại để tham khảo

**JSDoc/TSDoc:** Không thấy dùng thường xuyên; types định nghĩa rõ (DetailMovie, Episode, …) thay cho mô tả dài

## Function Design

**Size:** Không có quy ước cứng; một số file lớn (e.g. `custom-player.tsx`) chứa nhiều logic trong một component

**Parameters:** Object khi nhiều tham số (e.g. `getDetailMovie({ slug })`, `getLatestUpdateMovieList({ page: 1 })`)

**Return Values:**
- API modules: trả về `queryOptions(...)` hoặc type
- `request<T>`: `Promise<T | null>`
- `getUserId`: `Promise<string | null>`
- Route Handlers: `NextResponse.json(...)`

## Module Design

**Exports:**
- Named export cho component và helper — e.g. `export function useAuth`, `export const VideoPlayer`, `export const getDetailMovie`
- Default export cho page và một số component — e.g. `export default function Home`, `export default VideoPlayer`
- Types export cùng file với implementation — e.g. `export type DetailMovie`, `export type Episode`

**Barrel Files:** Không dùng barrel (index.ts) cho api/ hay component/; import trực tiếp từ file

---

*Convention analysis: 2025-03-08*
