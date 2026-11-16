# Xem chung — Phase 1 (Lõi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hai người có tài khoản tạo phòng cố định, mời nhau bằng link, xem chung (đồng bộ KKPHIM), chat realtime có lưu, vào lại thì tiếp tục đúng chỗ.

**Architecture:** Postgres (3 bảng + RLS + RPC security definer) là nguồn sự thật cho phòng/thành viên/tin/snapshot phát. Supabase Realtime private channel `room:<id>` cho lệnh điều khiển, presence, emoji (broadcast) và tin mới (postgres_changes). Logic đồng bộ là module thuần (test được), gắn vào video.js qua `onReady`. Ghi dữ liệu qua API route Next dùng `getUserSupabase` như `/api/watched`.

**Tech Stack:** Next.js 15 App Router, React 19, TanStack Query 5, Tailwind 4, `@supabase/supabase-js` 2.58 (Realtime), video.js 8. Test: Vitest (thêm mới).

**Spec:** `docs/superpowers/specs/2026-11-11-xem-chung-design.md` · UI: `design_handoff_xem_chung/README.md` (mục 01, 03, 04, 05, 06 trừ đếm ngược, 07). Đọc cả hai trước khi bắt đầu.

## Global Constraints

- Tên phòng: trim, 1–40 ký tự. Tin nhắn: trim, 1–500 ký tự. Lịch sử chat: trang 50 tin.
- Invite token: ngẫu nhiên url-safe ≥ 16 ký tự; link = `window.location.origin + '/moi/' + token`.
- Tên hiển thị = phần trước `@` của email, giữ chữ thường, cắt `…` sau 16 ký tự. Màu avatar hash theo userId → pink / yel / cyan / orange.
- Tập trong phòng = `(server_name, episode_key)`, `episode_key = slug || name`.
- Sync: bỏ seek nếu lệch < 0.5s; last-write-wins theo `sentAt`; snapshot DB mỗi 10s + pause / đổi tập / đổi phim / `pagehide`; presence mỗi ~5s; reconnect backoff 1, 2, 4… tối đa 15s.
- Emoji: 😂 ❤️ 😮 😭 🔥 👏; throttle 1 cái/250ms/người; tối đa ~12 trên màn hình; bay 2.6s.
- Toast đồng bộ tồn tại 3s, toast mới thay cũ, không toast cho thao tác của mình.
- Ngoài phòng, `VideoPlayer` và trang chi tiết **giữ nguyên hành vi** (khôi phục tiến trình, nhảy quảng cáo, FinishBanner).
- Không `console.log`; lỗi API dạng `{ error: string }` tiếng Việt như `/api/watched`. Không `dangerouslySetInnerHTML` cho nội dung chat.
- Mọi file mới ≤ 400 dòng; component theo feature trong `src/component/watch-party/`, logic trong `src/lib/watch-room/`.
- Supabase MCP read-only: SQL do user chạy tay trong SQL Editor. Không push khi user chưa xác nhận.

## Review Focus

1. **Hai người bấm gần như cùng lúc** (cùng `sentAt` tới ms) → cả hai máy hội tụ về cùng một lệnh (tie-break theo `by` userId), không dao động. → test ở Task 3.
2. **Người vào sau khi bên kia đang phát, vị trí bù trễ vượt độ dài video** → clamp về `duration`, không seek ra ngoài. → test ở Task 3.
3. **Access token hết hạn (~1h) giữa buổi xem** → Realtime vẫn chạy nhờ `setAuth` làm mới trước hạn 60s. → test `msUntilTokenRefresh` ở Task 3.
4. **Tab bị ẩn / máy ngủ rồi quay lại** → khi `visibilitychange` sang visible, gửi `state_request` và áp trạng thái mới nhất thay vì chạy lệch. → bước kiểm tay ở Task 10 + gọi trong Task 7.
5. **Tin nhắn chứa HTML / chỉ khoảng trắng / link** → hiển thị đúng chữ, không chèn HTML; khoảng trắng bị từ chối; link thành `<a rel="noopener noreferrer" target="_blank">`. → test `linkify` + `parseMessageText` ở Task 2/4.

---

### Task 1: Test infra + SQL schema

**Files:**
- Create: `vitest.config.ts`, `supabase/xem_chung.sql`
- Modify: `package.json` (devDeps `vitest`; script `"test": "vitest run"`)

**Interfaces:**
- Produces (DB): bảng `watch_rooms`, `watch_room_members`, `watch_room_messages` đúng cột ở spec §4.1; hàm `is_room_member(uuid) returns bool`; RPC `create_room(p_name text, p_display_name text) returns table(id uuid, invite_token text)`, `join_room(p_token text, p_display_name text) returns uuid` (raise `invalid_token`), `room_invite_preview(p_token text) returns json`, `save_room_state(p_room_id uuid, p_movie jsonb, p_server_name text, p_episode_slug text, p_episode_name text, p_position_sec numeric, p_is_playing bool) returns void`, `log_room_event(p_room_id uuid, p_type text, p_value text) returns void` (thành viên; `p_type` ∈ pause|play|seek|episode|movie; ghi `kind='event'` với `user_id = auth.uid()`).
- Produces (Realtime): policy trên `realtime.messages` cho `select`/`insert` khi `realtime.topic() = 'room:' || id` và `is_room_member(id)`; `watch_room_messages` trong publication `supabase_realtime`.

- [ ] **Step 1:** `pnpm add -D vitest`; `vitest.config.ts` với `resolve.alias: { '@': path.resolve(__dirname, 'src') }`, `test.environment: 'node'`, `include: ['src/**/*.test.ts']`.
- [ ] **Step 2:** Viết `supabase/xem_chung.sql` theo kiểu `supabase/watched_movies.sql` (idempotent: `create … if not exists`, `drop policy if exists`, comment tiếng Việt đầu file). Token: `encode(gen_random_bytes(12), 'base64')` rồi thay `+/=` → url-safe (16 ký tự). `create_room` validate tên 1–40 sau trim. `join_room` idempotent (`on conflict do nothing`), chỉ ghi event `join` khi thật sự thêm mới. `room_invite_preview` trả `{ name, inviter, member_count, movie, episode_name, position_sec, is_member }` và trả `room_id` **chỉ khi** `is_member`. Mọi RPC `security definer set search_path = public`, `grant execute … to authenticated`. Bảng: RLS bật; select phòng/thành viên/tin khi `is_room_member`; insert tin khi `user_id = auth.uid() and is_room_member(room_id) and kind = 'text'`; update thành viên chỉ cột `last_read_at` của mình. Không policy insert cho `watch_room_members`/`watch_rooms` (chỉ qua RPC).
- [ ] **Step 3:** Giao SQL cho user chạy; user báo "chạy xong". Sau đó kiểm bằng Supabase MCP (read-only): `list_tables` thấy 3 bảng có `rls_enabled = true`; `execute_sql`: `select proname from pg_proc where proname in ('create_room','join_room','room_invite_preview','save_room_state','is_room_member')` → 5 dòng.
- [ ] **Step 4:** User bật **Realtime → Settings → tắt "Allow public access"** (private channel bắt buộc qua policy). Ghi lại trong commit message.
- [ ] **Step 5:** Commit `chore: add vitest and xem chung schema`.

### Task 2: Types + validation

**Files:**
- Create: `src/types/watch-room.ts`, `src/lib/watch-room/validation.ts`, `src/lib/watch-room/validation.test.ts`

**Interfaces:**
- Produces:
  - `type RoomMovie = { source: MovieSource; slug: string; title: string; poster: string }`
  - `type RoomEpisode = { serverName: string; episodeKey: string; episodeName: string }`
  - `type RoomState = { movie: RoomMovie | null; episode: RoomEpisode | null; positionSec: number; isPlaying: boolean; updatedAt: string | null; updatedBy: string | null }`
  - `type RoomMember = { userId: string; displayName: string; joinedAt: string; isOwner: boolean }`
  - `type RoomSummary = { id: string; name: string; members: RoomMember[]; state: RoomState; lastActivityAt: string }`
  - `type RoomMessage = { id: string; roomId: string; userId: string; kind: 'text' | 'event'; text: string | null; event: { type: RoomEventType; value?: string } | null; createdAt: string }`, `type RoomEventType = 'pause'|'play'|'seek'|'episode'|'movie'|'join'|'leave'|'rename'|'create'`
  - `parseRoomName(input: unknown): { ok: true; value: string } | { ok: false; error: string }`
  - `parseMessageText(input: unknown): { ok: true; value: string } | { ok: false; error: string }`
  - `isValidInviteToken(token: string): boolean` (regex `^[A-Za-z0-9_-]{16,64}$`)
  - `isUuid(id: string): boolean`
  - `episodeKeyOf(ep: { slug: string; name: string }): string`

- [ ] **Step 1: Test** — `parseRoomName('  Tui với Hùng ')` → ok `'Tui với Hùng'`; `''`, `'   '`, 41 ký tự, `123` → not ok. `parseMessageText` 500 ký tự ok, 501 / `'  \n '` not ok, `'<b>x</b>'` ok giữ nguyên chuỗi. `isValidInviteToken('abc')` false, `'a'.repeat(16)` true, `'../../etc/passwd0000'` false. `episodeKeyOf({ slug: '', name: 'Tập 5' })` → `'Tập 5'`.
- [ ] **Step 2:** `pnpm test` → FAIL (module không tồn tại).
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(xem-chung): add room types and validation`.

### Task 3: Sync engine (thuần)

**Files:**
- Create: `src/lib/watch-room/sync.ts`, `src/lib/watch-room/sync.test.ts`

**Interfaces:**
- Produces:
  - `type ControlType = 'play' | 'pause' | 'seek' | 'episode' | 'movie'`
  - `type ControlMessage = { type: ControlType; positionSec: number; isPlaying: boolean; episode: RoomEpisode | null; movie: RoomMovie | null; sentAt: number; by: string }`
  - `SEEK_TOLERANCE_SEC = 0.5`
  - `targetPosition(msg: ControlMessage, serverNow: number, duration: number | null): number` — nếu `isPlaying`: `positionSec + (serverNow - sentAt)/1000`, clamp `[0, duration]` khi có duration.
  - `shouldSeek(current: number, target: number): boolean`
  - `isNewer(msg: ControlMessage, last: Pick<ControlMessage,'sentAt'|'by'> | null): boolean` — `sentAt` lớn hơn thắng; bằng nhau thì `by` lớn hơn (so sánh chuỗi) thắng.
  - `estimateServerOffset(samples: { sentAt: number; receivedAt: number; serverTime: number }[]): number` — chọn mẫu RTT nhỏ nhất, `offset = serverTime + rtt/2 - receivedAt`.
  - `msUntilTokenRefresh(expiresAtSec: number, nowMs: number): number` — `max(0, expiresAtSec*1000 - nowMs - 60_000)`.
  - `createEchoGuard(): { suppress(kind: 'seek'|'play'|'pause', ms?: number): void; isSuppressed(kind: 'seek'|'play'|'pause', now?: number): boolean }` — mặc định 800ms.

- [ ] **Step 1: Test** — `targetPosition({positionSec:100,isPlaying:true,sentAt:1000,…}, 3000, null)` = 102; đang pause → 100; `duration=101` → 101 (Review Focus 2). `shouldSeek(10, 10.4)` false, `(10, 10.6)` true. `isNewer` với cùng `sentAt`, `by:'b'` vs last `by:'a'` → true, ngược lại false (Review Focus 1); `null` → true. `estimateServerOffset` với 3 mẫu chọn RTT nhỏ nhất. `msUntilTokenRefresh(1000, 900_000)` = 40_000; đã quá hạn → 0 (Review Focus 3). Echo guard: `suppress('seek')` rồi `isSuppressed('seek', now+500)` true, `now+900` false, `isSuppressed('play')` false.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(xem-chung): add pure sync engine`.

### Task 4: Chat helpers (thuần)

**Files:**
- Create: `src/lib/watch-room/chat-format.ts`, `src/lib/watch-room/chat-format.test.ts`

**Interfaces:**
- Produces:
  - `displayNameFromEmail(email: string | null | undefined): string` (trước `@`, cắt 16 + `…`; rỗng → `'ẩn danh'`)
  - `avatarTone(userId: string): 'pink' | 'yel' | 'cyan' | 'orange'` (hash ổn định)
  - `formatPosition(sec: number): string` (`35:20`, `1:02:05`)
  - `linkify(text: string): ({ kind: 'text'; value: string } | { kind: 'link'; href: string; value: string })[]` — chỉ `http(s)://`
  - `type ChatItem = { kind: 'day'; label: string } | { kind: 'event'; message: RoomMessage; count: number } | { kind: 'group'; userId: string; mine: boolean; messages: RoomMessage[] }`
  - `buildChatItems(messages: RoomMessage[], myId: string, now: Date): ChatItem[]` — tăng dần theo `createdAt`; gộp tin cùng người trong 2 phút; gộp event play/pause liên tiếp trong 5s (giữ cái cuối, `count`); chèn `day` "HÔM NAY" / "HÔM QUA" / `dd/MM`.

- [ ] **Step 1: Test** — `displayNameFromEmail('minhanh@gmail.com')` → `'minhanh'`; 20 ký tự trước @ → 16 + `…`. `avatarTone` gọi 2 lần cùng id → cùng kết quả. `formatPosition(2120)` → `'35:20'`, `3725` → `'1:02:05'`. `linkify('xem https://a.b/c nha')` → 3 phần, phần giữa link; `linkify('<script>')` → 1 phần text nguyên văn; `javascript:alert(1)` không thành link. `buildChatItems`: 2 tin cùng user cách 1 phút → 1 group; cách 3 phút → 2 group; pause→play→pause trong 3s → 1 event count 3; tin hôm qua + hôm nay → có 2 `day`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(xem-chung): add chat formatting helpers`.

### Task 5: API — auth phụ trợ + phòng

**Files:**
- Create: `src/app/api/time/route.ts`, `src/app/api/auth/realtime-token/route.ts`, `src/app/api/rooms/route.ts`, `src/app/api/rooms/[id]/route.ts`, `src/app/api/rooms/[id]/state/route.ts`, `src/app/api/rooms/[id]/events/route.ts`, `src/lib/watch-room/room-mapper.ts`, `src/lib/watch-room/room-mapper.test.ts`

**Interfaces:**
- Consumes: Task 2 types/validators; RPC Task 1; `getUserSupabase` (`src/lib/supabase-user-client.ts`).
- Produces:
  - `GET /api/time` → `{ now: number }` (`Cache-Control: no-store`)
  - `GET /api/auth/realtime-token` → `{ token: string; expiresAt: number }` (giây; decode `exp` từ JWT) hoặc 401. Nếu access token hết hạn nhưng có refresh token → refresh như `/api/auth/me`, set lại cookie, trả token mới.
  - `GET /api/rooms` → `{ data: RoomSummary[] }` sắp `lastActivityAt` desc
  - `POST /api/rooms` body `{ name }` → `{ data: { id: string; inviteToken: string } }` (gọi `create_room` với `displayNameFromEmail(user.email)`)
  - `GET /api/rooms/[id]` → `{ data: RoomSummary & { inviteToken: string } }` hoặc 404 khi không là thành viên
  - `POST /api/rooms/[id]/state` body `{ movie, episode, positionSec, isPlaying }` → `{ ok: true }` (gọi `save_room_state`)
  - `POST /api/rooms/[id]/events` body `{ type, value? }` → `{ ok: true }` (gọi `log_room_event`; `type` ngoài 5 giá trị → 400)
  - `mapRoomRow(row: unknown, members: unknown[], myId: string): RoomSummary` trong `room-mapper.ts`
  - Client wrappers trong `src/services/watch-room-service.ts`: `WATCH_ROOM_QUERY_KEY = 'watch-room'`, `getMyRooms()`, `getRoom(id)` (`queryOptions`), `createRoom(name)`, `saveRoomState(id, state)`, `logRoomEvent(id, type, value?)`, `fetchRealtimeToken()`, `fetchServerTime()` — cùng kiểu `callWatchedApi`.

- [ ] **Step 1: Test** `room-mapper.test.ts` — row DB snake_case (movie jsonb, `server_name`, `episode_slug`, `episode_name`, `position_sec` dạng string `'35.5'`) → `RoomSummary` camelCase với `positionSec: 35.5`, `episode: null` khi `episode_slug` null, `isOwner` đúng theo `owner_id`.
- [ ] **Step 2–4:** FAIL → implement mapper + routes → PASS. Routes validate `isUuid(id)` → 400; body qua `parseRoomName`; lỗi `console.error('[api/rooms] …')` + 500 như `/api/watched`.
- [ ] **Step 5:** `pnpm build` → OK. Kiểm tay (dev, đã đăng nhập): `fetch('/api/rooms',{method:'POST',body:JSON.stringify({name:'Thử'})})` → có id; `GET /api/rooms` thấy phòng; `GET /api/rooms/<id ngẫu nhiên>` → 404.
- [ ] **Step 6:** Commit `feat(xem-chung): add rooms API`.

### Task 6: API — tin nhắn + lời mời, middleware & login `next`

**Files:**
- Create: `src/app/api/rooms/[id]/messages/route.ts`, `src/app/api/invites/[token]/route.ts`, `src/lib/safe-next-path.ts`, `src/lib/safe-next-path.test.ts`
- Modify: `src/middleware.ts` (nhánh chưa đăng nhập), `src/app/login/page.tsx:28` (redirect sau login), `src/services/watch-room-service.ts`

**Interfaces:**
- Produces:
  - `GET /api/rooms/[id]/messages?before=<iso>` → `{ data: RoomMessage[]; hasMore: boolean }` (50 tin, mới nhất trước)
  - `POST /api/rooms/[id]/messages` body `{ text }` → `{ data: RoomMessage }`
  - `GET /api/invites/[token]` → `{ data: InvitePreview }` hoặc 404 `{ error: 'invalid_token' }`; `type InvitePreview = { name: string; inviter: string; memberCount: number; movie: RoomMovie | null; episodeName: string | null; positionSec: number; isMember: boolean; roomId: string | null }` (thêm vào `src/types/watch-room.ts`)
  - `POST /api/invites/[token]` → `{ data: { roomId: string } }`
  - `safeNextPath(raw: string | null): string | null` — chỉ nhận chuỗi bắt đầu `/`, không `//`, không `/\`, ≤ 512 ký tự.
  - Service: `getRoomMessages(id, before?)`, `sendRoomMessage(id, text)`, `getInvitePreview(token)`, `joinInvite(token)`.

- [ ] **Step 1: Test** `safeNextPath`: `'/moi/abc'` → giữ; `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `null`, `''` → null.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Middleware: chưa đăng nhập và path bắt đầu `/moi/` → redirect `/login?next=<pathname>`; các path khác giữ redirect `/home`. Login: sau đăng nhập `router.replace(safeNextPath(searchParams.get('next')) ?? '/')` (cả effect "đã đăng nhập" ở dòng 28 lẫn sau submit).
- [ ] **Step 6:** `pnpm build` OK. Kiểm tay: cửa sổ ẩn danh mở `/moi/xyz` → tới `/login?next=/moi/xyz`; `/profile` vẫn về `/home`; đăng nhập xong quay lại `/moi/xyz`.
- [ ] **Step 7:** Commit `feat(xem-chung): add messages and invite API, login next redirect`.

### Task 7: Realtime client + hook phòng

**Files:**
- Create: `src/lib/watch-room/supabase-browser.ts`, `src/component/watch-party/use-room-channel.ts`, `src/component/watch-party/use-server-clock.ts`

**Interfaces:**
- Consumes: Task 3 (`msUntilTokenRefresh`, `estimateServerOffset`, `ControlMessage`), Task 5 (`fetchRealtimeToken`, `fetchServerTime`).
- Produces:
  - `getBrowserSupabase(): SupabaseClient` (singleton, `auth: { persistSession: false, autoRefreshToken: false }`)
  - `useServerClock(): { serverNow: () => number; ready: boolean }` (3 mẫu `/api/time` lúc mount)
  - `type PresenceInfo = { userId: string; displayName: string; positionSec: number; isPlaying: boolean; episodeKey: string | null; onlineAt: number }`
  - `type ReactionMessage = { emoji: string; by: string; displayName: string }`
  - `useRoomChannel(roomId: string, me: { userId: string; displayName: string }, handlers: { onControl(m: ControlMessage): void; onReaction(m: ReactionMessage): void; onMessage(m: RoomMessage): void; onStateRequest(): void; onStateReply(m: ControlMessage): void }): { status: 'connecting' | 'live' | 'reconnecting'; presence: PresenceInfo[]; sendControl(m: ControlMessage): void; sendReaction(emoji: string): void; requestState(): void; replyState(m: ControlMessage): void; trackPresence(p: Omit<PresenceInfo,'userId'|'displayName'|'onlineAt'>): void }`

- [ ] **Step 1:** Implement: lấy token → `realtime.setAuth(token)` → `channel('room:'+roomId, { config: { private: true, broadcast: { self: false }, presence: { key: userId } } })`; broadcast events `control`, `reaction`, `state_request`, `state_reply`; `postgres_changes` INSERT `watch_room_messages` filter `room_id=eq.<id>`; hẹn `setTimeout(msUntilTokenRefresh(...))` để lấy token mới + `setAuth`. Kênh `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` → `status='reconnecting'`, thử lại backoff 1,2,4…15s; khi `SUBSCRIBED` lại → `requestState()`. `document.visibilitychange` → visible thì `requestState()` (Review Focus 4). Handlers giữ trong ref để không re-subscribe. Cleanup `removeChannel` + clear timer khi unmount.
- [ ] **Step 2:** `pnpm build` + `npx tsc --noEmit` OK.
- [ ] **Step 3:** Kiểm tay tạm (2 tab, 2 tài khoản, phòng chung từ Task 5/6): trang thử `/phong/[id]` tối giản in `status` và presence → cả hai thấy nhau `live`; tài khoản **không** là thành viên → kênh lỗi, không nhận gì. (Trang thử sẽ được thay ở Task 9.)
- [ ] **Step 4:** Commit `feat(xem-chung): add realtime room channel hook`.

### Task 8: Gắn sync vào player

**Files:**
- Modify: `src/component/player/custom-player.tsx` (props + chặn khôi phục tiến trình ở dòng ~434 và ~517)
- Create: `src/component/watch-party/use-player-sync.ts`

**Interfaces:**
- Consumes: Task 3, Task 7 (`sendControl`, `onControl` qua handler).
- Produces:
  - `VideoPlayerProps.disableProgressRestore?: boolean` (mặc định `false` = hành vi cũ). Khi `true`: không seek tới tiến trình đã lưu, không `play()` tự động khi load; vẫn lưu tiến trình như cũ.
  - `VideoPlayerProps.onSeekProgrammatic?: (kind: 'seek') => void` — gọi **trước** mọi `player.currentTime(x)` do code tự làm (nhảy quảng cáo dòng ~360, khôi phục tiến trình). Nút ±10s/90s, phím tắt, kéo thanh tua là thao tác người dùng → không gọi.
  - `usePlayerSync(opts: { player: Player | null; myId: string; serverNow: () => number; episode: RoomEpisode | null; movie: RoomMovie | null; send(m: ControlMessage): void }): { applyRemote(m: ControlMessage): void; currentControl(): ControlMessage | null; guard: ReturnType<typeof createEchoGuard> }`
    - Lắng nghe `play`, `pause`, `seeked` của player; bỏ qua nếu `guard.isSuppressed(kind)` hoặc đang `waiting`/`seeking` do buffer; còn lại `send` với `sentAt = serverNow()`.
    - `applyRemote`: bỏ nếu `!isNewer`; `guard.suppress(...)` rồi seek theo `targetPosition`/`shouldSeek`, play/pause theo `isPlaying` (`play()?.catch` — autoplay bị chặn thì hiện nút "Bấm để vào cùng" ở Task 9).

- [ ] **Step 1:** Implement prop trong player (diff nhỏ, giữ nguyên nhánh mặc định). Nối `onSeekProgrammatic` vào `guard.suppress('seek')` từ phía phòng.
- [ ] **Step 2:** `pnpm build` OK. Hồi quy tay ngoài phòng: mở 1 phim KKPHIM ở trang chi tiết, xem 1 phút, tải lại → vẫn khôi phục đúng chỗ; FinishBanner vẫn hiện ở tập cuối.
- [ ] **Step 3:** Commit `feat(xem-chung): wire player sync with echo guard`.

### Task 9: Trang phòng `/phong/[id]` — khung, player, chat

**Files:**
- Create: `src/app/phong/[id]/page.tsx`, `src/component/watch-party/room-page.tsx`, `room-header.tsx`, `room-player.tsx`, `room-episode-strip.tsx`, `room-panel.tsx`, `chat-list.tsx`, `chat-input.tsx`, `emoji-popover.tsx`, `avatar.tsx`, `src/app/watch-party.css`
- Delete: trang thử ở Task 7

**Interfaces:**
- Consumes: Task 2–8; `getMovieDetail({ slug, source })` (`src/services/movie-service.ts:564`); `useAuth()`; `WatchedToast` pattern; `BottomSheet`, `useIsMobile` (`src/component/watched/*`).
- Produces: `RoomPage({ roomId }: { roomId: string })`; `Avatar({ userId, name, size, online? })`.

- [ ] **Step 1:** `getRoom(id)` 404 → màn "Không vào được phòng này" (dùng thẻ LINK HỎNG của §04, nút "Về trang chủ"). Layout theo README §05 (desktop grid `minmax(0,1fr) 380px`) và §07 (mobile cột dọc, player sticky). Player: KKPHIM (`link_m3u8` có) → `VideoPlayer` với `disableProgressRestore`, `onReady` → `usePlayerSync`; còn lại → iframe + chú thích nguồn nhúng (§06, **không** nút đếm ngược ở phase này). Episode strip + header + info row "Đổi phim" (mở modal tìm, dùng `getCombinedSearch`, ưu tiên KKPHIM).
- [ ] **Step 2:** Mỗi lệnh do **mình** gửi (play/pause/seek/episode/movie) cũng gọi `logRoomEvent` — throttle 1 sự kiện / 2s, seek liên tiếp chỉ ghi cái cuối (`value` = `formatPosition` hoặc tên tập/phim). Đổi tập/phim (ai cũng được) → `sendControl({type:'episode'|'movie',…})` + `saveRoomState`; nhận `episode`/`movie` → đổi nguồn player/iframe.
- [ ] **Step 3:** Snapshot: khi mình đang phát `setInterval(10_000)` `saveRoomState`; thêm khi pause/đổi tập/phim và `pagehide` (`navigator.sendBeacon` tới `/api/rooms/[id]/state`). `trackPresence` mỗi 5s. `onStateRequest` → nếu mình online và có `currentControl()` thì `replyState`.
- [ ] **Step 4:** Chat panel: lịch sử `getRoomMessages` (cuộn lên tải thêm `before`), `buildChatItems`, `linkify` → text node / `<a target="_blank" rel="noopener noreferrer">`; gửi lạc quan (bubble opacity .55 "đang gửi", lỗi → "⚠ Gửi lại"); `onMessage` gộp, bỏ trùng theo `id`. Enter gửi, Shift+Enter xuống dòng, giới hạn 500. Nút mic disabled + tooltip "Sắp có". Chip thành viên từ `members` + `presence`.
- [ ] **Step 5:** Emoji popover 6 nút (§05), `sendReaction` throttle 250ms; vùng emoji bay (§05, `prefers-reduced-motion` → không bay, chỉ hiện mờ dần). Toast đồng bộ (§05 copy) cho lệnh của người khác, thay toast cũ, 3s, `role="status"`. Chip trạng thái: `live` → "Đang đồng bộ ✓", `reconnecting` → cam "Mất kết nối, đang nối lại…" + ô chat disabled, chỉ mình online → "Chỉ mình bạn trong phòng", iframe → vàng "Nguồn nhúng · không đồng bộ".
- [ ] **Step 6:** `pnpm build` + `pnpm lint` OK.
- [ ] **Step 7:** Commit `feat(xem-chung): add room page with sync and chat`.

### Task 10: Trạng thái phòng, lối vào & lời mời

**Files:**
- Create: `src/component/watch-party/room-empty-state.tsx`, `resume-card.tsx`, `friend-offline-card.tsx`, `watch-party-button.tsx`, `room-picker-dialog.tsx`, `invite-dialog.tsx`, `src/app/moi/[token]/page.tsx`, `src/component/watch-party/invite-landing.tsx`
- Modify: `src/app/detail-movie/[slug]/page.tsx:352` (thêm `<WatchPartyButton detail={data} source={source} episode={…} />` sau `WatchedButton`), `src/component/watch-party/room-page.tsx`

**Interfaces:**
- Consumes: Task 5–6 services; Task 9 `RoomPage`.
- Produces: `WatchPartyButton({ detail, source, className? }: { detail: MovieDetail; source: MovieSource; className?: string })`; `InviteDialog({ roomId, roomName, inviteToken, isNew, open, onClose })`.

- [ ] **Step 1:** Trạng thái trong phòng (§06): chưa chọn phim (ô tìm "Tìm phim đi mại dô…"), card "Tiếp tục xem" khi vào lại và không ai đang phát (snapshot DB; bấm "▶ Tiếp tục từ mm:ss" = gửi `play` từ vị trí đó), có người đang phát → nhảy theo + toast "Đã vào cùng <tên> tại mm:ss"; bạn offline (desktop card trên player, mobile thẻ dưới player) có ô link + "Copy link nhắc". Autoplay bị chặn → nút "Bấm để vào cùng".
- [ ] **Step 2:** Nút "Xem chung" + popup chọn phòng (§01): radiogroup, mặc định phòng hoạt động gần nhất, cảnh báo khi phòng đang dở phim khác, "＋ Tạo phòng mới" mở rộng tại chỗ (đếm `n/40`), trạng thái chưa có phòng. "Mở trong phòng" → `saveRoomState` với phim này + tập đang chọn (hoặc tập đầu), vị trí 0, `isPlaying:false` → `router.push('/phong/'+id)`. Tạo phòng → vào phòng + mở `InviteDialog` biến thể "PHÒNG MỚI!". Mobile → bottom sheet.
- [ ] **Step 3:** Popup mời (§03): Copy (`navigator.clipboard.writeText`, trạng thái "✓ Đã copy" 2s, `aria-live`), mobile thêm "Chia sẻ qua…" khi có `navigator.share`. **Không** có "Tạo link mới" ở phase này.
- [ ] **Step 4:** `/moi/[token]` (§04): `isValidInviteToken` sai hoặc 404 → thẻ "LINK HỎNG" (`pekora-not-found.jpg`); `isMember` → `router.replace('/phong/'+roomId)`; còn lại thẻ mời + "Vào phòng ›" → `joinInvite` → `/phong/[roomId]`. Dòng "Đang đăng nhập: <email> · Không phải bạn?" (→ `logout`).
- [ ] **Step 5:** `pnpm build` + `pnpm lint` + `pnpm test` OK.
- [ ] **Step 6:** Commit `feat(xem-chung): add entry button, invite flow and room states`.

### Task 11: Kiểm thử đầu-cuối 2 tài khoản + hồi quy

**Files:** không tạo file (ghi kết quả vào báo cáo cho user).

- [ ] **Step 1:** Hai trình duyệt (thường + ẩn danh), 2 tài khoản A, B. A: trang phim KKPHIM → Xem chung → tạo "Thử" → copy link. B (chưa đăng nhập) mở link → login → tự quay lại → Vào phòng. Kỳ vọng: cả hai `Đang đồng bộ ✓`, chat "B đã vào phòng".
- [ ] **Step 2:** A play → B phát trong ≤ 1s, lệch < 0.5s. B pause → A dừng + toast "B đã tạm dừng · mm:ss". A tua 10s và kéo thanh tua → B theo. Đợi qua đoạn quảng cáo tự nhảy → không có toast/vòng lặp tua. A và B bấm pause/play gần như cùng lúc 5 lần → hai máy kết thúc cùng trạng thái.
- [ ] **Step 3:** Đổi tập (B) → A đổi theo. Chat 2 chiều, thử `<b>hi</b>` (hiện nguyên văn), link (bấm được), 501 ký tự (bị chặn), emoji bay ở cả hai máy.
- [ ] **Step 4:** B ẩn tab 2 phút rồi quay lại → khớp vị trí A (Review Focus 4). Tắt mạng A 10s → chip cam, bật lại → khớp. Cả hai đóng tab, A mở lại phòng → card "Tiếp tục xem" đúng tập/phút; chat cũ còn.
- [ ] **Step 5:** Tài khoản C không là thành viên mở `/phong/<id>` → màn không có quyền; gọi `/api/rooms/<id>/messages` → 404. Phim nguồn VSMOV trong phòng → iframe + chú thích, đổi tập vẫn đồng bộ.
- [ ] **Step 6:** Hồi quy ngoài phòng: trang chi tiết KKPHIM khôi phục tiến trình, nhảy quảng cáo, FinishBanner, nút Đã xem/Yêu thích; middleware: `/profile` khi chưa đăng nhập → `/home`.
- [ ] **Step 7:** Báo cáo kết quả cho user; **không push** khi chưa được xác nhận.
