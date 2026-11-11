# Xem chung (Watch party) — Design

Ngày: 2026-11-11 · UI spec: `design_handoff_xem_chung/README.md` (hi-fi, nguồn sự thật cho giao diện — tài liệu này không lặp lại giá trị pixel).

## 1. Intent

Người dùng muốn **một chỗ cố định để xem phim cùng một người bạn từ xa** và trò chuyện trong lúc xem. Hiện tại chủ yếu là 2 người; mấy người bạn khác có thể tham gia sau. Thay cho cảnh nhắn "3-2-1 bấm play" và lệch nhau.

Thành công = hai người mở cùng một link phòng, thấy cùng phim/cùng đoạn, ai dừng/tua thì máy kia theo, chat realtime, lần sau vào lại phòng thì tiếp tục đúng chỗ và vẫn thấy chat cũ.

## 2. Goals / Non-goals / Anti-goals

**Goals**
- Phòng **cố định**, có tên, có thành viên; một người có nhiều phòng.
- Mời bằng link; người **đã đăng nhập** bấm là thành thành viên ngay (không duyệt).
- **Mọi thành viên** đều điều khiển: play / pause / tua / đổi tập / đổi phim. Last-write-wins.
- Đồng bộ tự động với nguồn **KKPHIM** (player riêng video.js). Nguồn nhúng (VSMOV, NGUỒN C) chỉ đồng bộ phim/tập + có **đếm ngược 3-2-1**.
- Chat realtime, **lưu lại**; emoji bay lên video (không lưu).
- Presence (ai online, đang ở phút nào).
- Phòng **nhớ** phim + tập + vị trí → card "Tiếp tục xem".
- Các bổ sung của Claude Design được user đồng ý: vai trò chủ phòng (đổi tên / xoá; rời thì chuyển quyền cho người vào sớm nhất), "Tạo link mới" (vô hiệu link cũ), nút Phòng trên navbar + badge chưa đọc, tab "Phòng xem chung" trong Hồ sơ, "đang gõ", gộp tin, phân cách "N TIN MỚI".

**Non-goals (bản này)**
- Voice chat — chỉ có nút mic disabled "Sắp có". (2 người → sau này P2P WebRTC là đủ.)
- Khách không tài khoản. Mọi thành viên phải có tài khoản (tài khoản do admin cấp trên Supabase).
- Duyệt thành viên, kick, phân quyền điều khiển.
- Đồng bộ play/pause/tua cho iframe (bất khả: cross-origin).

**Anti-goals** (hỏng dù "chạy được")
- Hai máy giành nhau tua (vòng lặp sync / echo), giật liên tục khi lệch nhỏ.
- Người ngoài phòng đọc được chat hoặc ghi vào phòng.
- Làm chậm/hỏng trang chi tiết phim & player hiện tại khi **không** ở trong phòng.

## 3. Constraints (từ codebase)

- Next.js 15 App Router + Tailwind, React Query. Supabase (Auth + Postgres + Realtime). Deploy Vercel.
- **Auth bằng cookie httpOnly** (`sb-access-token`, `sb-refresh-token`); trình duyệt không có Supabase session. API route dùng `getUserSupabase(req)` (`src/lib/supabase-user-client.ts`) để chạy RLS dưới đúng user.
- Middleware (`src/middleware.ts`) chặn mọi trang trừ `/home`, `/login` khi chưa đăng nhập → redirect `/home`.
- Supabase MCP của Claude **read-only** → SQL viết vào `supabase/xem_chung.sql`, user tự chạy trong SQL Editor (như `supabase/watched_movies.sql`: idempotent, có RLS).
- Player KKPHIM: `src/component/player/custom-player.tsx` (video.js). Có `onReady(player)`. Player **tự seek** ở: khôi phục tiến trình (localStorage/`initialTime`), nhảy qua vùng quảng cáo, nút ±10s/90s, phím tắt.
- Trang chi tiết `src/app/detail-movie/[slug]/page.tsx` (823 dòng) — đã quá lớn; thêm nút Xem chung bằng component riêng, không nhồi logic phòng vào đây.
- Tập được định danh bằng `link_embed` hiện nay; phim bằng `(source, slug)`. `EpisodeItem.slug` có thể rỗng (NguonC, `mapping.ts:98`) và trùng giữa các server (Vietsub / Thuyết minh) → trong phòng tập = `(server_name, episode_key)` với `episode_key = slug || name`.

## 4. Kiến trúc

### 4.1 Dữ liệu (Postgres — `supabase/xem_chung.sql`)

```
watch_rooms
  id uuid pk default gen_random_uuid()
  name text 1..40 (trim)
  owner_id uuid -> auth.users (on delete set null → chuyển quyền bằng trigger/RPC)
  invite_token text unique (random ≥ 16 ký tự url-safe, gen bằng gen_random_bytes)
  -- trạng thái phát (snapshot, ghi định kỳ)
  movie jsonb null         -- { source, slug, title, poster }
  server_name text null    -- server_data thuộc server nào (Vietsub / Thuyết minh…)
  episode_slug text null   -- episode_key = slug || name của tập (xem §3)
  episode_name text null   -- để hiển thị
  position_sec numeric not null default 0
  is_playing bool not null default false
  state_updated_at timestamptz, state_updated_by uuid
  created_at timestamptz default now(), last_activity_at timestamptz default now()

watch_room_members
  room_id uuid -> watch_rooms on delete cascade
  user_id uuid -> auth.users on delete cascade
  display_name text   -- phần trước @ của email, chụp lúc join (client không đọc được auth.users)
  joined_at timestamptz default now()
  last_read_at timestamptz default now()
  pk (room_id, user_id)

watch_room_messages
  id uuid pk, room_id -> watch_rooms on delete cascade, user_id uuid
  kind text check in ('text','event')
  text text <= 500 (bắt buộc khi kind='text')
  event jsonb null  -- { type: pause|play|seek|episode|movie|join|leave|rename|create, value? }
  created_at timestamptz default now()
  index (room_id, created_at desc)
```

**RLS**: hàm `is_room_member(room_id)` (security definer, stable). Thành viên được select phòng / thành viên / tin; insert tin với `user_id = auth.uid()`; update `last_read_at` của chính mình. Không ai insert trực tiếp vào `watch_room_members` — chỉ qua RPC.

**RPC (security definer)**
- `create_room(name)` → tạo phòng + thêm người tạo làm thành viên + event `create`. Trả `{id, invite_token}`.
- `join_room(token)` → idempotent; trả `{room_id}` hoặc lỗi `invalid_token`. Thêm event `join` (chỉ lần đầu).
- `room_invite_preview(token)` → tên phòng, người mời (owner display_name), số thành viên, phim đang dở; **không** trả id phòng nếu chưa là thành viên. Dùng cho `/moi/[token]`.
- `rotate_invite(room_id)` — mọi thành viên (README: nút ở popup mời, ai cũng thấy).
- `rename_room`, `delete_room` — chỉ owner.
- `leave_room(room_id)` — nếu owner rời và còn người → owner = thành viên `joined_at` sớm nhất; nếu không còn ai → xoá phòng.
- `save_room_state(room_id, movie, server_name, episode_slug, episode_name, position_sec, is_playing)` — thành viên; cập nhật `last_activity_at`.

Bảng/RPC thêm vào publication `supabase_realtime` chỉ cho `watch_room_messages` (để nhận tin qua postgres_changes; RLS áp dụng).

### 4.2 Realtime

Một channel / phòng: `room:<id>`, **private channel** (Realtime Authorization) với RLS trên `realtime.messages`: chỉ `is_room_member` được join/broadcast/presence. Topic chứa room id, policy parse id từ `realtime.topic()`.

- **Broadcast** (không lưu): `control` (play/pause/seek/episode/movie), `countdown` (start/cancel), `reaction`, `typing`, `state_request` / `state_reply` (người mới vào xin trạng thái hiện tại).
- **Presence**: `{ userId, displayName, positionSec, isPlaying, serverName, episodeSlug }` cập nhật ~5s và khi đổi trạng thái.
- **postgres_changes** INSERT trên `watch_room_messages` lọc `room_id=eq.<id>` → chat + sự kiện.

**Token cho Realtime**: thêm `GET /api/auth/realtime-token` trả access token hiện tại (+ `expires_at`) từ cookie. Client gọi `supabase.realtime.setAuth(token)` và gọi lại trước khi hết hạn (dựa trên `expires_at`, tận dụng refresh có sẵn ở middleware/`/api/auth/me`). Đánh đổi đã chấp nhận: token lộ ra JS chỉ trong trang phòng. Client Supabase cho trình duyệt tạo riêng (`src/lib/supabase-browser.ts`, `persistSession:false`), chỉ dùng trong trang phòng.

Chat **gửi** qua API route `POST /api/rooms/[id]/messages` (dùng `getUserSupabase`, validate 1..500 ký tự) hoặc insert trực tiếp qua client đã setAuth — builder chọn; RLS là chốt chặn trong cả hai cách. Đọc lịch sử: phân trang 50 tin, mới nhất trước.

### 4.3 Thuật toán đồng bộ (KKPHIM)

- Mỗi lệnh `control`: `{ type, positionSec, isPlaying, serverName, episodeSlug, movie?, sentAt (ms, đồng hồ server ước lượng), by }`.
- **Đồng hồ**: client ước lượng `serverOffset` qua `GET /api/time` (trả `Date.now()` server; lấy RTT/2, đo 3 lần chọn RTT nhỏ nhất). Dùng cho bù trễ và `startAt` của đếm ngược.
- **Áp lệnh**: nếu đang phát, `target = positionSec + (serverNow - sentAt)/1000`. Bỏ qua seek nếu `|current - target| < 0.5s`; play/pause luôn áp.
- **Last-write-wins** theo `sentAt`; bỏ lệnh cũ hơn lệnh cuối đã áp.
- **Chống echo**: chỉ phát lệnh từ thao tác **của người dùng**. Seek/play/pause do code gây ra (áp lệnh từ xa, khôi phục tiến trình, nhảy quảng cáo) bị đánh dấu `suppress` (cờ trong khoảng thời gian ngắn hoặc bộ đếm theo sự kiện) và không phát ra. Nhảy quảng cáo xảy ra như nhau ở mọi máy nên không cần gửi.
- Trong phòng: **tắt khôi phục tiến trình localStorage** của player; vị trí lấy từ trạng thái phòng. (Thêm prop `syncMode`/`disableProgressRestore` vào `VideoPlayer`, mặc định giữ hành vi cũ ngoài phòng.)
- Buffering: không gửi lệnh khi `waiting`; chỉ gửi pause/play thật.
- **Người vào sau**: gửi `state_request`; thành viên đang online có `sentAt` mới nhất trả `state_reply`. Không ai online → dùng snapshot DB (`watch_rooms`) → card "Tiếp tục xem".
- **Snapshot**: thành viên đang phát gọi `save_room_state` mỗi 10s, khi pause, đổi tập/phim, `pagehide`.
- **Mất kết nối**: video tiếp tục cục bộ; khi nối lại (backoff 1,2,4…15s) gửi `state_request` và áp trạng thái mới nhất.
- Đổi tập/phim: đồng bộ cho mọi nguồn (kể cả iframe — đổi URL iframe). Đổi phim từ trang chi tiết ("Mở trong phòng") = lệnh `movie` + ghi DB.
- Sự kiện chat (`event` messages): ghi cho pause/play/seek/episode/movie/join/leave/rename — gộp play/pause liên tiếp trong 5s (gộp phía client khi hiển thị; phía ghi có thể throttle 1 event/2s/người).

### 4.4 Định tuyến & middleware

- `/phong` — danh sách phòng (mobile; desktop dùng tab Hồ sơ `/profile/rooms`).
- `/phong/[id]` — trang phòng. Không phải thành viên → màn "không có quyền / link hỏng".
- `/moi/[token]` — trang nhận lời mời.
- Middleware: khi chưa đăng nhập vào `/moi/...` (và mọi trang nội dung), redirect `/login?next=<path>` thay vì `/home` **chỉ cho `/moi/*`** (giữ hành vi cũ cho trang khác). Login page sau khi đăng nhập `router.replace(next)` nếu `next` là path nội bộ (bắt đầu `/`, không `//`).
- Link mời dùng `window.location.origin` + `/moi/<token>`.

### 4.5 Giao diện

Theo `design_handoff_xem_chung/README.md` mục 01–08. Component mới đặt trong `src/component/watch-party/*` (file nhỏ, theo feature). Tái dùng `bottom-sheet.tsx`, toast, `use-is-mobile.ts` của "Đã xem". Tên hiển thị: phần trước `@` của email; màu avatar hash theo userId.

## 5. Phân phase (mỗi phase deploy được, user xác nhận trước khi push)

1. **Lõi**: SQL (bảng, RLS, RPC, realtime policy) · `/api/auth/realtime-token`, `/api/time` · nút Xem chung + popup chọn/tạo phòng (01) · popup mời (03) · `/moi/[token]` + middleware/login `next` (04) · trang phòng desktop + mobile (05, 07) với đồng bộ KKPHIM, presence, chat lưu + realtime, emoji bay, card Tiếp tục xem, trạng thái chưa chọn phim / bạn offline / mất kết nối, chú thích nguồn nhúng (không đếm ngược).
2. **Danh sách & thông báo**: nút Phòng navbar + menu (02) · tab Hồ sơ + `/phong` · chưa đọc (`last_read_at`, badge, phân cách "N TIN MỚI") · "đang gõ" · gộp tin.
3. **Hoàn thiện**: đếm ngược 3-2-1 (overlay, `startAt`) · "Đổi sang KKPHIM" · cài đặt phòng (08: đổi tên, thành viên, rời/xoá, chuyển owner) · "Tạo link mới".

## 6. Kiểm thử

- Unit: thuật toán sync (bù trễ, ngưỡng 0.5s, LWW, suppress echo), format tên/thời gian, gộp tin.
- SQL: kiểm thủ công trong SQL Editor với 2 user — người ngoài không select được tin/phòng, không join channel; `join_room` idempotent; token cũ sau rotate trả lỗi.
- E2E thủ công 2 trình duyệt (2 tài khoản): tạo → mời → join → play/pause/tua hai chiều → đổi tập → rời & vào lại (Tiếp tục xem) → rớt mạng & nối lại.
- Hồi quy: trang chi tiết & player ngoài phòng giữ nguyên hành vi (khôi phục tiến trình, nhảy quảng cáo, FinishBanner).

## 7. Calls của Claude (user kiểm khi đọc)

- Tập định danh bằng `(server_name, slug || name)` thay vì `link_embed` (ổn định hơn khi URL nguồn đổi; tách Vietsub/Thuyết minh).
- `display_name` chụp vào bảng thành viên lúc join (client không đọc được email người khác).
- Private Realtime channel + endpoint trả access token cho JS trong trang phòng.
- "Tạo link mới" cho mọi thành viên (theo README), đổi tên/xoá chỉ owner.
- Route tiếng Việt `/phong`, `/moi` theo README; desktop dùng tab Hồ sơ `/profile/rooms`.
- Middleware chỉ đổi redirect sang `/login?next=` cho `/moi/*`.
- Emoji, typing, điều khiển = broadcast không lưu; chỉ chat + sự kiện được lưu.
- Bản đầu không giới hạn số thành viên (README hỗ trợ >4 bằng "+N").

## 8. Để builder tự quyết

Tên file/component cụ thể, cơ chế suppress echo (cờ vs bộ đếm), gửi chat qua API route hay client trực tiếp, chiến lược phân trang chat, cách gộp event phía ghi, thư viện icon (Lucide hoặc path trong `xc-a.js`).
