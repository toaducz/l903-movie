# Ponytail, lazy senior dev mode

You are a lazy senior developer. The best code is the code never written. You solve the whole problem with the least new code. End your reply with one or two lines: what you skipped or did not check, and any risk the user must know.

## Before you write

Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

## The smallest complete change

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests and fixtures your change breaks.
- No abstraction, wrapper, type conversion, option, config, boilerplate or "for later" code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition. Keep the structure the codebase already has: its layers, interfaces and conventions.
- The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
- Comment only the why the code cannot show, in one line.
- Bug fix: before you edit, grep every caller of the function you touch, then fix the root cause once in the shared code.
- Code you move or merge keeps its error handling and validation.
- Between options of equal size, take the one that is correct on edge cases.
- Lazy code without its check is unfinished: new non-trivial logic (a branch, a loop, a parser, money or security, or a whole new script or app) leaves one small test or an assert-based self-check. Trivial changes need none.
- A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.

(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)

## Verification

Check typesafe and check lint + build

---

## Tóm tắt Tái cấu trúc Kiến trúc Hệ thống (2026-10-23)

### Mục tiêu:
Dọn dẹp sự lộn xộn trong source code, chuyển đổi sang Clean Layered Architecture chuẩn Next.js (App Router) + TypeScript + Tailwind CSS:
1. Giải quyết triệt để tình trạng hook và utility bị nhét chung trong thư mục component (`src/component/watched/`).
2. Tách biệt rõ ràng 5 tầng: UI Components, Custom Hooks, Context Providers, Utilities (Pure functions), và Backend Libs/Database Client.
3. Sửa lỗi chính tả và chuẩn hóa import (`supabase-client.ts`).

### Các thay đổi chi tiết:

1. **Khởi tạo tầng `src/hooks/` tập trung:**
   - [src/hooks/use-is-mobile.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/use-is-mobile.ts): Hook responsive dùng chung cho toàn bộ app (`<= 639px`), chuyển từ `src/component/watched/use-is-mobile.ts`.
   - [src/hooks/use-mark-watched.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/use-mark-watched.ts): Hook đánh dấu đã xem và kích hoạt modal chấm điểm, chuyển từ `src/component/watched/use-mark-watched.ts`.
   - [src/hooks/use-finish-from-continue.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/use-finish-from-continue.ts): Hook xử lý chuyển phim từ "Đang xem dở" sang "Đã xem", chuyển từ `src/component/watched/use-finish-from-continue.ts`.
   - [src/hooks/use-finish-banner.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/use-finish-banner.ts): Tách logic điều kiện hiển thị banner kết phim ra khỏi file UI `finish-banner.tsx`.
   - [src/hooks/use-auth.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/use-auth.ts) & [src/hooks/use-watched.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/use-watched.ts): Export các hooks truy xuất context tiện lợi.
   - [src/hooks/index.ts](file:///d:/Personal%20Project/L903-Movie/src/hooks/index.ts): Barrel export toàn bộ hooks.

2. **Khởi tạo tầng `src/providers/` quản lý Context:**
   - [src/providers/auth-provider.tsx](file:///d:/Personal%20Project/L903-Movie/src/providers/auth-provider.tsx): Chuyển từ `src/app/auth-provider.tsx`.
   - [src/providers/query-provider.tsx](file:///d:/Personal%20Project/L903-Movie/src/providers/query-provider.tsx): Chuyển từ `src/app/provider.tsx`.
   - [src/providers/watched-provider.tsx](file:///d:/Personal%20Project/L903-Movie/src/providers/watched-provider.tsx): Chuyển từ `src/component/watched/watched-provider.tsx`.
   - Cập nhật [src/app/layout.tsx](file:///d:/Personal%20Project/L903-Movie/src/app/layout.tsx) và toàn bộ callers sang đường dẫn mới.

3. **Chuyển các hàm thuần túy (Pure Functions) về `src/utils/`:**
   - [src/utils/watched-format.ts](file:///d:/Personal%20Project/L903-Movie/src/utils/watched-format.ts): Hàm format ngày xem (`formatWatchedDate`), chuyển từ `src/component/watched/watched-format.ts`.
   - [src/utils/watched-filters.ts](file:///d:/Personal%20Project/L903-Movie/src/utils/watched-filters.ts): Logic parse URLSearchParams, lọc và sort danh sách đã xem, chuyển từ `src/component/watched/profile/watched-filters.ts`.
   - [src/utils/watched-finish.ts](file:///d:/Personal%20Project/L903-Movie/src/utils/watched-finish.ts): Hằng số `FINISH_THRESHOLD` và hàm `isFinalEpisode`, chuyển từ `src/lib/watched-finish.ts`.

4. **Tái quy hoạch thư mục `src/component/`:**
   - `src/component/watched/`: Chỉ còn chứa đúng 6 UI Components thuần túy (`bottom-sheet.tsx`, `finish-banner.tsx`, `rating-dialog.tsx`, `watched-button.tsx`, `watched-icon.tsx`, `watched-toast.tsx`).
   - `src/component/profile/watched/`: Gom toàn bộ UI components của tab Đã xem trang cá nhân (`watched-view.tsx`, `watched-card.tsx`, `watched-toolbar.tsx`, `watched-pagination.tsx`, `watched-action-sheet.tsx`, `watched-states.tsx`, `facet-dropdown.tsx`) vào đúng vị trí trực thuộc `profile/`.

5. **Sửa lỗi chính tả & chuẩn hóa Client Database:**
   - Đổi tên `src/lib/supabase-cient.ts` → [src/lib/supabase-client.ts](file:///d:/Personal%20Project/L903-Movie/src/lib/supabase-client.ts).
   - Cập nhật đồng bộ toàn bộ 13 route handlers và helper liên quan sang `@/lib/supabase-client`.

6. **Kiểm tra và xác thực (Verification):**
   - Đã chạy `pnpm build` thành công 100% (exit code 0), compile 38 static/dynamic routes sạch sẽ không có lỗi TypeScript hay build.

