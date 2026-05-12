# Tài liệu API Ophim CMS (Ophim1.com)

Tài liệu mô tả chi tiết các endpoint của API từ hệ thống Ophim, bao gồm tham số truyền vào (Parameters), các giá trị Enum được phép sử dụng và cấu trúc dữ liệu trả về (Response). Các request gọi bằng phương thức `GET`.

> **Lưu ý Domain:** Bạn có thể thay đổi `https://ophim1.com/v1/api/` thành các domain dự phòng tương ứng của hệ thống tùy thuộc vào thông báo mới nhất của admin hệ thống.

---

## 1. Lấy danh sách phim mới cập nhật (Trang Chủ)

Trả về danh sách các bộ phim vừa được cập nhật tập mới hoặc vừa được thêm vào hệ thống.

- **URL:** `https://ophim1.com/v1/api/home`
- **Method:** `GET`

### Parameters (Query)

| Name   | Type    | Required | Default | Enum / Valid Values | Description                |
| :----- | :------ | :------- | :------ | :------------------ | :------------------------- |
| `page` | Integer | No       | `1`     | `> 0`               | Số trang muốn lấy dữ liệu. |

---

## 2. Lấy thông tin chi tiết phim & Link stream

Lấy toàn bộ thông tin chi tiết của phim (tên, đạo diễn, diễn viên, nội dung), thông tin các tập phim và link server (m3u8, embed) để phát video.

- **URL:** `https://ophim1.com/v1/api/phim/{slug}`
- **Method:** `GET`

### Parameters (Path)

| Name   | Type   | Required | Enum / Valid Values | Description                                                            |
| :----- | :----- | :------- | :------------------ | :--------------------------------------------------------------------- |
| `slug` | String | Yes      | _Động_              | Chuỗi định danh của phim (Ví dụ: `mat-biec`, `one-piece`, `mai-2024`). |

---

## 3. Lấy danh sách Danh mục (Master Data: Thể loại & Quốc gia)

Sử dụng endpoint này để lấy toàn bộ danh sách Thể loại và Quốc gia có trên hệ thống để phục vụ cho việc hiển thị Menu hoặc Filter lọc phim (không cần hardcode).

- **Danh sách Thể Loại:** `https://ophim1.com/v1/api/the-loai`
- **Danh sách Quốc Gia:** `https://ophim1.com/v1/api/quoc-gia`
- **Method:** `GET`

---

## 4. Lấy danh sách / Lọc phim nâng cao (v1 API)

Sử dụng phiên bản **v1** để lấy dữ liệu thống nhất, có phân trang rõ ràng và hỗ trợ lọc (filter) mạnh mẽ.

### Các Endpoints cơ bản:

- **Phim Lẻ:** `https://ophim1.com/v1/api/danh-sach/phim-le`
- **Phim Bộ:** `https://ophim1.com/v1/api/danh-sach/phim-bo`
- **Hoạt Hình:** `https://ophim1.com/v1/api/danh-sach/hoat-hinh`
- **TV Shows:** `https://ophim1.com/v1/api/danh-sach/tv-shows`
- **Phim theo Thể Loại:** `https://ophim1.com/v1/api/the-loai/{slug-the-loai}`
- **Phim theo Quốc Gia:** `https://ophim1.com/v1/api/quoc-gia/{slug-quoc-gia}`

### Parameters (Query) - Dành cho Lọc & Sắp xếp

| Name         | Type    | Required | Default         | Valid Values / Enums                                                                               | Description                        |
| :----------- | :------ | :------- | :-------------- | :------------------------------------------------------------------------------------------------- | :--------------------------------- |
| `page`       | Integer | No       | `1`             | `> 0`                                                                                              | Trang hiện tại.                    |
| `limit`      | Integer | No       | `24`            | `> 0`                                                                                              | Số lượng phim trên mỗi trang.      |
| `sort_field` | String  | No       | `modified.time` | `"modified.time"` (Mới cập nhật)<br>`"_id"` (Mới đăng)<br>`"year"` (Năm SX)<br>`"view"` (Lượt xem) | Trường dữ liệu để sắp xếp kết quả. |
| `sort_type`  | String  | No       | `desc`          | `"desc"` (Giảm dần)<br>`"asc"` (Tăng dần)                                                          | Chiều sắp xếp.                     |
| `status`     | String  | No       | _(Tất cả)_      | `"ongoing"` (Đang chiếu)<br>`"completed"` (Hoàn thành)<br>`"trailer"` (Sắp chiếu)                  | Trạng thái phim.                   |
| `type`       | String  | No       | _(Tất cả)_      | `"series"` (Phim bộ)<br>`"single"` (Phim lẻ)<br>`"hoathinh"` (Hoạt hình)<br>`"tvshows"` (TV Shows) | Định dạng phim.                    |
| `year`       | Integer | No       | _(Tất cả)_      | `2024`, `2023`, `2022`...                                                                          | Lọc theo năm phát hành.            |

---

## 5. Tìm kiếm phim

Tìm kiếm phim theo từ khóa. Có hỗ trợ các tham số Lọc (giống Mục 4) để tìm kiếm nâng cao (VD: Tìm từ khóa "Batman" và thuộc năm 2022).

- **URL:** `https://ophim1.com/v1/api/tim-kiem`
- **Method:** `GET`

---

## 6. Cấu trúc Response Trả Về

### A. Response API Lấy danh sách Danh mục (Thể loại / Quốc gia)

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "_id": "64c12...",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "_id": "64c13...",
        "name": "Tình Cảm",
        "slug": "tinh-cam"
      }
    ]
  }
}
```

## 7. Response API Danh sách Phim / Lọc / Tìm kiếm (v1)

```json
{
  "status": "success",
  "data": {
    "seoOnPage": {
      "titleHead": "Phim Hành Động",
      "descriptionHead": "Danh sách phim hành động..."
    },
    "breadCrumb": [
      { "name": "Thể loại", "slug": "the-loai" },
      { "name": "Hành Động", "slug": "hanh-dong" }
    ],
    "titlePage": "Phim Hành Động",
    "items": [
      {
        "_id": "64b0f...",
        "name": "Tên phim",
        "slug": "ten-phim",
        "origin_name": "Tên gốc của phim",
        "type": "single",
        "status": "completed",
        "poster_url": "v2/poster-file.jpg",
        "thumb_url": "v2/thumb-file.jpg",
        "time": "120 Phút",
        "episode_current": "Full",
        "quality": "HD",
        "lang": "Vietsub",
        "year": 2024,
        "category": [{ "id": "1", "name": "Hành Động", "slug": "hanh-dong" }],
        "country": [{ "id": "1", "name": "Mỹ", "slug": "my" }]
      }
    ],
    "params": {
      "pagination": {
        "totalItems": 5000,
        "totalItemsPerPage": 24,
        "currentPage": 1,
        "totalPages": 209
      }
    },
    "APP_DOMAIN_FRONTEND": "https://ophim1.com",
    "APP_DOMAIN_CDN_IMAGE": "https://img.ophim.live/uploads/movies/"
  }
}
```

## 8. Response API Chi tiết phim (/phim/{slug})

```json
{
  "status": true,
  "msg": "",
  "movie": {
    "_id": "64b0...",
    "name": "Tên phim",
    "slug": "ten-phim",
    "content": "<p>Nội dung chi tiết của phim (HTML format)...</p>",
    "type": "series",
    "status": "ongoing",
    "thumb_url": "https://img.ophim.live/uploads/movies/thumb.jpg",
    "poster_url": "https://img.ophim.live/uploads/movies/poster.jpg",
    "trailer_url": "https://youtube.com/watch?v=xxx",
    "time": "45 Phút/Tập",
    "episode_current": "Tập 10",
    "episode_total": "24 Tập",
    "quality": "HD",
    "lang": "Vietsub",
    "year": 2024,
    "view": 1500,
    "actor": ["Diễn viên A", "Diễn viên B"],
    "director": ["Đạo diễn C"],
    "category": [{ "name": "Hành Động", "slug": "hanh-dong" }],
    "country": [{ "name": "Hàn Quốc", "slug": "han-quoc" }]
  },
  "episodes": [
    {
      "server_name": "Vietsub #1",
      "server_data": [
        {
          "name": "Tập 1",
          "slug": "tap-1",
          "filename": "tap-1-file",
          "link_embed": "https://ophim1.com/share/xxx",
          "link_m3u8": "https://s1.ophim.live/m3u8/xxx/index.m3u8"
        }
      ]
    }
  ]
}
```

### 9. Hướng dẫn xử lý đường dẫn Hình Ảnh (Thumbnail & Poster)

Để tối ưu băng thông, ở phiên bản V1 API, Ophim trả về đường dẫn tương đối. Bạn bắt buộc phải xử lý ghép chuỗi để render ảnh:

Trích xuất APP_DOMAIN_CDN_IMAGE từ response tổng và ghép với thumb_url / poster_url trong từng item:

const baseUrlImage = data.APP_DOMAIN_CDN_IMAGE;
// Thường là: https://img.ophim.live/uploads/movies/

const posterUrl = `${baseUrlImage}${item.poster_url}`;
const thumbUrl = `${baseUrlImage}${item.thumb_url}`;

(Lưu ý: Domain ảnh img.ophim.cc hay img.ophim.live có thể thay đổi tùy thời điểm, hãy luôn lấy linh động từ trường APP_DOMAIN_CDN_IMAGE trả về ở API để không bị lỗi ảnh).

### 10. Để lấy danh sách các tập phim từ API Chi tiết (Response ở mục 8), bạn cần xử lý mảng `episodes`.

Mảng này là dạng ** Nested Array** (Mảng lồng nhau), chứa các server (chủ server), và bên trong mỗi server lại có danh sách các tập (`server_data`).

```json
{
  "movie": { ... },
  "episodes": [
    {
      "server_name": "Vietsub #1",
      "server_data": [
        { "name": "Tập 1", "slug": "tap-1", "link_embed": "...", "link_m3u8": "..." },
        { "name": "Tập 2", "slug": "tap-2", "link_embed": "...", "link_m3u8": "..." }
      ]
    },
    {
      "server_name": "Vietsub #2",
      "server_data": [
        { "name": "Tập 1", "slug": "tap-1", "link_embed": "...", "link_m3u8": "..." },
        { "name": "Tập 2", "slug": "tap-2", "link_embed": "...", "link_m3u8": "..." }
      ]
    }
  ]
}
```
