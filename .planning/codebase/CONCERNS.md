# Codebase Concerns

**Analysis Date:** 2026-08-26 (Updated)

## Tech Debt & Improvements

**Unified Movie Service Adapter (`src/services/movie-service.ts`):**
- Đã giải quyết: Tách biệt hoàn toàn UI khỏi API thô của từng nhà cung cấp. UI components chỉ giao tiếp qua `movie-service.ts`.
- Chuyển đổi nguồn chính linh hoạt qua biến môi trường `NEXT_PUBLIC_DEFAULT_SOURCE` (`kkphim` | `ophim` | `nguonc`).

**CORS & Cloudflare WAF Bypass:**
- Đã giải quyết: `src/utils/request.ts` gọi trực tiếp `fetch(fullUrl)` từ Client-side đối với các API có header CORS (`Access-Control-Allow-Origin: *` như `phim.nguonc.com`, `phimapi.com`), sử dụng IP dân cư của người dùng để tránh bị Cloudflare chặn HTTP 403 do IP Datacenter của Vercel.

**Chuẩn hóa hiển thị hình ảnh (Image Orientation):**
- Đã giải quyết: Khắc phục triệt để tình trạng ngược ảnh poster/thumb.
  - `poster_url`: Luôn luôn là ảnh dọc (Portrait 2:3).
  - `thumb_url`: Luôn luôn là ảnh ngang (Landscape 16:9 / Backdrop).
  - Đã cấu hình `remotePatterns` trong `next.config.ts` cho các domain `phimimg.com`, `img.ophim.live`, `ophim1.com`, `phim.nguonc.com`.
  - Loại bỏ hoàn toàn proxy bên thứ ba không ổn định (`wsrv.nl`).

**Tách bạch & Chuẩn hóa Đã xem (Rating 5★) và Bình luận phim:**
- Đã giải quyết: Xử lý dứt điểm sự chồng chéo giữa `watched_movies` và `movie_reviews`.
  - `watched_movies`: Đóng vai trò là Single Source of Truth cho trạng thái Đã xem, ngày xem, ghi chú cá nhân và điểm số chính thức (thang 1–5 sao). Trang Profile Tổng quan hiển thị "Phim đã đánh giá" lấy trực tiếp từ `watched_movies`.
  - `movie_reviews`: Chuyển thành khu vực "Bình luận phim" (Community Discussion) thuần túy, không ép buộc người dùng chấm điểm.
  - Gắn huy hiệu Người xem uy tín (`★ {score} · Đã xem`) cho những bình luận từ người đã thực sự xem và chấm điểm phim.

**Tối ưu hiệu năng tải Hồ sơ công khai & Fix lỗi RLS chập chờn (Public Profile & RLS):**
- Đã giải quyết:
  - Khắc phục lỗi "có lúc load được có lúc không" khi xem Lịch sử / Đã xem của người khác do xung đột RLS và rò rỉ phiên singleton `setSession` trên server.
  - Chuyển `api/history` sang `getUserSupabase` (client độc lập theo từng request), cho phép khách/người khác xem công khai mà không bị chặn 401.
  - Tối ưu `api/user/[id]/public-profile` từ 3 truy vấn tuần tự 4.5s xuống chạy song song `Promise.allSettled` dưới 1s.
  - Bổ sung `staleTime: 5 phút` cho `public_profile` trong `profile-shell.tsx`, tránh giật lag khi chuyển đổi tab.

**Giao diện Quyền riêng tư & Phân quyền thao tác Hồ sơ thành viên khác:**
- Đã giải quyết:
  - **Tab Tổng quan khi riêng tư (Hướng 1):** Khi thành viên khác đặt danh sách Đã xem ở chế độ riêng tư, khu vực *"Phim đã đánh giá"* ở tab Tổng quan hiển thị thẻ thông báo bảo mật với icon 🔒 *"Danh sách đánh giá đang ở chế độ riêng tư"*, đồng thời ẩn liên kết "Xem tất cả".
  - **Tab Đã xem xong! của người khác:** Ẩn triệt để toàn bộ các nút thao tác chỉnh sửa/xoá (overlay `.dx-wc-ov`, nút "Sửa điểm", "Xoá", "Chấm nhanh", nút ⋯ trên mobile và dòng nhắc nhở khóa ở header) khi người xem không phải chính chủ (`!isOwner`).
  - Khi hover vào poster của người khác, chỉ kích hoạt hiệu ứng nghiêng card tự nhiên và điều hướng tới trang chi tiết phim khi click, không gây hiểu lầm là có quyền sửa/xóa.

## Performance & Caching

**TanStack Query Invalidation:**
- Đã nâng cấp tiền tố `queryKey` sang `movie-service-v3` để đảm bảo làm mới toàn bộ cache cũ trên trình duyệt người dùng.
- Giảm `staleTime` tìm kiếm xuống 30s để kết quả tìm kiếm luôn cập nhật tức thì.

---

*Concerns audit updated: 2026-10-14*
