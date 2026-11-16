# Architecture

**Analysis Date:** 2026-08-26 (Updated)

## Pattern Overview

**Overall:** Next.js App Router SPA-style với BFF (Route Handlers), client-first rendering, Unified Movie Service Adapter kết nối đa nguồn API (KKPhim, OPhim, NguonC).

**Key Characteristics:**
- **Kiến trúc Server-First / Client Components:** Mọi UI page đều là client components (`'use client'`) sử dụng TanStack React Query để fetch và cache dữ liệu.
- **Unified Movie Service Layer (`src/services/movie-service.ts`):** Cổng giao tiếp duy nhất giữa UI và các nhà cung cấp API phim (KKPhim, OPhim, NguonC). Cho phép chuyển đổi nguồn chính thông qua biến môi trường `NEXT_PUBLIC_DEFAULT_SOURCE=kkphim`.
- **Cơ chế Direct Fetch + Proxy Fallback:** Gọi API trực tiếp từ client (`fetch(fullUrl)`) đối với các nguồn hỗ trợ CORS (`phim.nguonc.com`, `phimapi.com`) sử dụng IP người dùng để vượt Cloudflare WAF (tránh bị chặn 403 khi đi qua IP Datacenter của Vercel). Fallback sang `/api/proxy` khi cần thiết.
- **Server state:** TanStack React Query (`queryKey` prefix `movie-service-v3`); auth: React Context + HTTP-only cookies.
- **Persistence:** Supabase (favorites, notifications, watched_movies, movie_reviews), localStorage (watch history).

## Layers

**UI (Pages & Components):**
- Purpose: Màn hình và component tái sử dụng
- Location: `src/app/` (routes + layouts), `src/page/` (page-level client components), `src/component/`
- Contains: Client components, `useQuery(queryOptions(...))`, navigation, forms
- Depends on: `@/services/movie-service`, `@/component/*`, `@/utils/*`, `@/lib/*`
- Used by: User (browser)

**Movie Service Layer (Adapter):**
- Purpose: Chuẩn hóa dữ liệu từ các API nguồn khác nhau (KKPhim, OPhim, NguonC) về các interface đồng nhất (`MovieItem`, `MovieDetail`, `MovieListResult`, `CombinedSearchResult`).
- Location: `src/services/movie-service.ts`, `src/types/movie.ts`
- Contains:
  - `getLatestMovies`, `getListMovies`, `getMoviesByCategory`, `getMoviesByCountry`, `getMoviesByYear`
  - `getMovieDetail`, `getCategories`, `getCountries`, `searchMovies`, `getSearchSuggestions`
  - `getCombinedSearch`: Tìm kiếm gộp đa nguồn KKPhim + OPhim (loại bỏ trùng lặp slug, phân trang đồng bộ).
- Quy ước hình ảnh chuẩn hóa:
  - `poster_url`: Luôn luôn là **Ảnh Dọc (Portrait 2:3)** dùng cho các thẻ phim dọc, poster chi tiết, bảng xếp hạng.
  - `thumb_url`: Luôn luôn là **Ảnh Ngang (Landscape 16:9 / Backdrop)** dùng cho banner đầu trang và thẻ 16:10.
- Depends on: `@/api/kkphim/*`, `@/api/ophim/*`, `@/utils/request`, `@/utils/env`, `@/utils/mapping`

**API / Data layer (Low-level client):**
- Purpose: Định nghĩa các hàm fetch API chi tiết cho từng nhà cung cấp
- Location: `src/api/kkphim/`, `src/api/ophim/`, `src/api/nguonc/`, `src/api/pagination.tsx`
- Contains: `queryOptions()`, types riêng của từng nguồn, gọi `request()`

**BFF (Route Handlers):**
- Purpose: Proxy CORS, auth (login/logout/me), favorites CRUD, notifications, reviews, AI recommendations
- Location: `src/app/api/` — `proxy/route.ts`, `auth/*`, `favorite/*`, `notifications/*`, `review/*`, `recommendations/*`
- Contains: GET/POST/DELETE/PUT handlers, Supabase client, cookie read/set, `getUserId(req)`
- Depends on: `src/lib/supabaseClient.ts`, `src/lib/auth-helper.ts`

**Shared / lib:**
- Purpose: Supabase singleton, auth helper (server), env constants, mapping helpers
- Location: `src/lib/`, `src/utils/`
- Contains: `supabaseClient.ts`, `auth-helper.ts`, `request.ts`, `env.ts`, `mapping.ts`, `common.ts`, `local-storage.ts`

## Data Flow

**Movie list/detail (read):**
1. Component gọi `useQuery(getLatestMovies({ page: 1 }))` hoặc `useQuery(getMovieDetail({ slug }))` từ `@/services/movie-service`.
2. Service xác định nguồn đang chọn (`resolvedSource = source ?? DEFAULT_MOVIE_SOURCE`).
3. Gọi hàm fetch tương ứng từ `@/api/kkphim` hoặc `@/api/ophim`.
4. `request()` gọi trực tiếp API đích từ browser (nếu có CORS) hoặc fallback qua `/api/proxy?url=...`.
5. Dữ liệu thô được chuẩn hóa qua `mapKKMovieToItem`, `mapKKDetailToShared` hoặc `mapOphim*` đảm bảo chuẩn `poster_url` (dọc) và `thumb_url` (ngang).
6. TanStack Query cache và cung cấp data chuẩn cho component render.

**Combined Search (Tìm kiếm gộp):**
1. `useQuery(getCombinedSearch({ keyword, page }))` gọi đồng thời API KKPhim và OPhim bằng `Promise.allSettled`.
2. Gộp kết quả, ưu tiên KKPhim và bổ sung các phim từ OPhim không bị trùng slug.
3. Tính toán `totalItems` và `totalPages` chính xác từ dữ liệu phân trang của cả 2 nguồn.

**Auth & Favorites:**
1. Login: POST `/api/auth/login` → Supabase signInWithPassword → set HTTP-only cookies (`sb-access-token`, `sb-refresh-token`).
2. Protected actions: Route Handlers kiểm tra session qua `getUserId(req)`.
3. Client: `AuthProvider` sync trạng thái qua `/api/auth/me`.

**Rating & Community Comments (Đã xem & Bình luận):**
1. **Đã xem & Điểm số (Rating 1–5 sao):** Quản lý qua `watched_movies`. Là Single Source of Truth cho việc đánh giá phim và nhật ký xem phim của người dùng. Mục *"Phim đã đánh giá"* ở trang Profile lấy trực tiếp từ `watched_movies` với điều kiện `score is not null`.
2. **Bình luận cộng đồng (Discussion Thread):** Quản lý qua `movie_reviews`. Nơi thảo luận, hỏi đáp không bắt buộc chấm điểm. Hỗ trợ cây bình luận lồng nhau qua `parent_id`.
3. **Huy hiệu Người xem uy tín (Verified Watcher Badge):** Khi hiển thị bình luận (`GET /api/review`), backend tự động join trạng thái từ `watched_movies` để gắn huy hiệu `★ {score} · Đã xem` bên cạnh tên người bình luận nếu họ đã thực sự xem và chấm điểm phim đó.

**Profile Privacy & Public Profile Architecture:**
1. **Cài đặt quyền riêng tư:** Quản lý qua `user_privacy_settings` với hai cờ `is_history_public` và `is_watched_public`.
2. **Chế độ hiển thị Tổng quan:** Nếu người khác tắt công khai tab Đã xem, khu vực *"Phim đã đánh giá"* ở trang Tổng quan hiển thị thẻ 🔒 thông báo chế độ riêng tư và ẩn liên kết "Xem tất cả".
3. **Phân quyền UI (Ownership Guard):** Component `WatchedCard` và `WatchedView` nhận diện quyền sở hữu qua `isOwner = !userId || (Boolean(user?.id) && userId === user?.id)`. Khi xem người khác:
   - Lớp phủ hover `.dx-wc-ov` (Sửa điểm, Xoá) và nút "Chấm nhanh" bị loại bỏ hoàn toàn khỏi DOM.
   - Nút ⋯ (`WatchedActionSheet`) và dòng ghi chú bảo mật ở header không hiển thị.
   - Hover vào card chỉ kích hoạt hiệu ứng nghiêng poster và nhấp để mở trang chi tiết phim.

---

*Architecture analysis updated: 2026-10-14*
