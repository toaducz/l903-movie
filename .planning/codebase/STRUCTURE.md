# Codebase Structure

**Analysis Date:** 2026-10-23 (Refactored to Clean Layered Architecture)

## Directory Layout

```
L903-Movie/
├── src/
│   ├── api/              # Low-level API queryOptions + types (KKPhim, OPhim, NguonC)
│   ├── app/              # App Router: layouts, pages, API routes
│   │   ├── api/          # Route Handlers: proxy, auth, favorite, review, notifications, recommendations, watched
│   │   ├── layout.tsx    # Root layout bọc các Providers
│   │   ├── page.tsx      # Trang chủ
│   │   ├── detail-movie/[slug]/
│   │   ├── search/, list-movie/, all-movie/, login/, profile/, nguonc/, ophim/, kkphim/, users/
│   │   └── error.tsx, not-found.tsx
│   ├── component/        # Reusable presentation UI components
│   │   ├── chat-widget/  # Widget chat hỗ trợ
│   │   ├── filter/       # Bộ lọc phim
│   │   ├── interactive/  # Tương tác: đánh giá review, yêu thích, tập phim, phụ đề, phân trang
│   │   ├── item/         # Thẻ phim: movie-item, movie-rank-item, user-item
│   │   ├── layout/       # navbar, footer, notification-bell, nprogress-init
│   │   ├── login/        # Animation đăng nhập
│   │   ├── notice/       # Thông báo đêm muộn
│   │   ├── player/       # custom-player (video.js, hls quality, subtitles)
│   │   ├── profile/      # profile-shell, profile-private-locked
│   │   │   └── watched/  # Sub-components cho tab Đã xem của Profile (watched-view, card, toolbar, pagination...)
│   │   ├── sections/     # hero, series-row, movies-row, anime-row, continue-watching, mood
│   │   ├── status/       # loading, error, warning
│   │   └── watched/      # UI components thuần cho tính năng Đã xem (rating-dialog, watched-button, finish-banner, toast, icon, bottom-sheet)
│   ├── hooks/            # Custom React Hooks tập trung cho toàn ứng dụng
│   │   ├── index.ts
│   │   ├── use-auth.ts
│   │   ├── use-is-mobile.ts
│   │   ├── use-mark-watched.ts
│   │   ├── use-finish-from-continue.ts
│   │   ├── use-finish-banner.ts
│   │   └── use-watched.ts
│   ├── lib/              # Backend helpers, Supabase client & validation schemas
│   │   ├── auth-helper.ts
│   │   ├── supabase-client.ts      # Supabase client singleton
│   │   ├── supabase-user-client.ts # Supabase client theo phiên người dùng
│   │   ├── watched-summary.ts
│   │   └── watched-validation.ts
│   ├── page/             # Page-level client components (search-result, movie-list, all-movie, …)
│   ├── providers/        # Context Providers tập trung
│   │   ├── auth-provider.tsx       # AuthContext & useAuth
│   │   ├── query-provider.tsx      # TanStack QueryClientProvider
│   │   └── watched-provider.tsx    # WatchedContext & useWatched
│   ├── services/         # Unified Movie Service Adapter (movie-service.ts, watched-service.ts)
│   ├── types/            # Unified movie types (MovieItem, MovieDetail, WatchedMovie, ...)
│   └── utils/            # Pure helpers & utilities
│       ├── common.ts, env.ts, mapping.ts, request.ts, local-storage.ts, movie-link.ts, parse-srt.ts, subtitle-settings.ts
│       ├── watched-format.ts       # Format ngày giờ hiển thị
│       ├── watched-filters.ts      # Parsing và logic lọc URL params cho danh sách đã xem
│       └── watched-finish.ts       # Logic kiểm tra tập cuối và ngưỡng xem xong
├── public/               # Static assets
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── .prettierrc.js
└── package.json
```

## Directory Purposes

**`src/providers/`:**
- Purpose: Quản lý toàn bộ React Context Providers của ứng dụng (`AuthProvider`, `QueryProvider`, `WatchedProvider`).
- Bọc ngoài cùng trong `src/app/layout.tsx`.

**`src/hooks/`:**
- Purpose: Thư mục tập trung chứa tất cả Custom Hooks tái sử dụng (responsive `useIsMobile`, auth `useAuth`, watched hooks `useWatched`, `useMarkWatched`, `useFinishFromContinue`, `useFinishBanner`).

**`src/component/`:**
- Purpose: Chứa các Presentation Components thuần túy, không chứa hooks hay logic context cấp thấp.
- `src/component/watched/`: Chỉ chứa các component tương tác đánh giá (`rating-dialog.tsx`, `watched-button.tsx`, `finish-banner.tsx`, `watched-toast.tsx`, `watched-icon.tsx`, `bottom-sheet.tsx`).
- `src/component/profile/watched/`: Chứa các sub-components hiển thị tab "Đã xem" của trang hồ sơ cá nhân.

**`src/utils/`:**
- Purpose: Chứa các hàm tiện ích thuần túy (pure functions) không phụ thuộc vào React state hay DOM lifecycle (`watched-format.ts`, `watched-filters.ts`, `watched-finish.ts`, `common.ts`, `request.ts`).

**`src/lib/`:**
- Purpose: Client kết nối cơ sở dữ liệu (`supabase-client.ts`, `supabase-user-client.ts`), helper xác thực server (`auth-helper.ts`), và validation schemas (`watched-validation.ts`, `watched-summary.ts`).

---

*Structure analysis updated: 2026-10-23*
