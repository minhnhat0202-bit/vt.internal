# Kênh truyền thông nội bộ: Bản tin TV và trang Giải thể thao 2026

Trang web tĩnh, không cần build, chạy trên GitHub Pages (repo `minhnhat0202-bit/vt.internal`). Push lên `main` là deploy.
Hai trang **độc lập** với nhau:

| Trang | Địa chỉ | Dùng cho |
|---|---|---|
| Bản tin TV Trung tâm | `https://minhnhat0202-bit.github.io/vt.internal/tv/` | Màn hình TV: Tin tiêu điểm, lịch, dòng chạy. Nội dung trong `tv/content.js` |
| Trang Giải thể thao | `https://minhnhat0202-bit.github.io/vt.internal/` | Thống kê Giải: lịch, số liệu đăng ký, sơ đồ; `#slides` = thẻ xoay vòng của Giải |

Link cũ `…/#tv` và `…/#tv2` tự chuyển sang `tv/`.

```
tv/index.html       trang Bản tin TV (giao diện + mã, ít khi phải sửa)
tv/content.js       NỘI DUNG bản tin TV: tin tiêu điểm, lịch 3 khung bên phải, dòng chạy. Việc hằng ngày chỉ sửa file này
index.html          trang Giải thể thao, kèm thẻ xoay vòng (#slides)
media.js, media.json  danh sách ảnh, video từ thư mục Google Drive cho tin Drive của bản tin TV
media/              video đã chuyển mã H.264 MP4 (GitHub Action tạo)
tools/drive-media.py  sinh lại media.js và media.json từ thư mục Drive công khai
.github/workflows/    GitHub Action tự chạy tools/drive-media.py mỗi 15 phút
apps-script/media.gs  tùy chọn: Apps Script trả danh sách ảnh nhanh hơn
img/                poster đã xử lý (web 2400 và 1200, bản cắt 16:9 cho TV, poster lịch thi đấu), logo
fonts/              FS PF BeauSans Pro (tiêu đề), Roboto (thân bài)
TRUYEN-THONG.md     tệp này
```

## Có gì trên trang

| Mục | Nguồn dữ liệu | Cập nhật |
|---|---|---|
| Poster Giải | `img/poster-2400.webp`, `img/poster-1200.webp`, `img/poster-1200.jpg` (xuất từ file in 3×2 m) | Tĩnh |
| Hôm nay và sắp tới, Lịch thi đấu | Hằng `SCHEDULE` trong `index.html`, theo poster lịch thi đấu | Tự đổi trạng thái theo ngày |
| Số liệu Cầu lông, Bida, Bóng bàn | Apps Script `?action=state` (hằng `SHEETS_API_URL`) | Mỗi 60 giây |
| Số liệu PES, Bóng đá | `SCHEDULE[...].static`, chốt 30/09 | Sửa tay |
| Sơ đồ, kết quả 3 môn | Apps Script, tab Brackets | Mỗi 60 giây |
| Chế độ TV thẻ xoay vòng | Thêm `#slides` vào link | 5 thẻ xoay vòng, 12 đến 15 giây/thẻ |

Khi không nối được Apps Script, trang hiện số liệu theo bản chốt 30/09 (hằng `SNAPSHOT`) và góc trên ghi "Số liệu chốt 30/09".

## Việc cần làm một lần: điền địa chỉ trang đăng ký

Mở `index.html`, tìm dòng

```js
const REG_URL = '';
```

và dán địa chỉ GitHub Pages của trang đăng ký (repo `giai-the-thao-2026`), ví dụ
`https://<tai-khoan>.github.io/giai-the-thao-2026/`. Khi đó nút "Đăng ký & sơ đồ chi tiết", liên kết ở chân trang và
liên kết "Xem sơ đồ đầy đủ" của từng môn sẽ dẫn đúng sang trang đó, có sẵn `#cau-long`, `#bida`, `#bong-ban`.
Để trống thì các liên kết này được ẩn, trang vẫn chạy bình thường.

## Bản tin TV (`tv/`)

Mở `https://minhnhat0202-bit.github.io/vt.internal/tv/` trên thiết bị phát. Bố cục một màn hình cố định: thanh tiêu đề có ngày giờ, khung lớn **Tin tiêu điểm** bên trái,
3 khung bên phải **Tin các phòng** (tin phòng ban đã duyệt, mỗi tin 10 giây; chưa có tin thì hiện mã QR tới trang gửi tin), **Hôm nay**, **Sắp diễn ra**, dòng chạy **Đừng bỏ lỡ** phía dưới. Mọi nội dung nằm trong `tv/content.js`, hướng dẫn từng trường ghi ngay đầu file.

- **Tin tiêu điểm:** mảng `STORIES`, thứ tự mảng là thứ tự chiếu. Thanh story tự chia theo số tin. Mỗi tin chọn một kiểu nội dung:
  `source: 'drive'` (ảnh Drive ngẫu nhiên, có thẻ mở đầu pháo hoa), `slides` (nhiều ảnh lần lượt, có bộ đếm, mỗi ảnh có thể có dòng phụ riêng),
  `items` (video rồi ảnh), `image` (một poster). `until: 'YYYY-MM-DD'` để tin tự ẩn sau ngày đó.
- **Kết quả giải đấu:** một tab duy nhất `id: 'ket-qua'`, mỗi môn là một dòng trong `slides` (`src` poster, `sub` = "Môn · Vô địch: …"), 20 giây/poster.
  Môn mới có kết quả: thêm ảnh vào `img/ket-qua-<mon>.jpg` và thêm một dòng vào `slides`, thêm câu vào `ticker` của tin.
- **Tin thời sự trong ngày (thư mục Daily News):** chép video sang `media/` (H.264 MP4), ảnh sang `img/` (cạnh dài tối đa 1600, JPG),
  thêm một tin vào `STORIES`, commit và push. Nhớ `git add` cả file video/ảnh.
- **Khung Hôm nay, Sắp diễn ra:** mảng `AGENDA`. Mục có `to` là một giai đoạn, không có `to` là sự kiện một ngày; cả hai hiện ở Hôm nay khi đang diễn ra.
  Sắp diễn ra = 4 mục gần nhất. Mục thêm tay cho Hôm nay: `TODAY`. Mục đã qua tự ẩn. Khung tự chia trang theo chiều cao, 7 giây mỗi trang.
- **Dòng chạy:** tự gom 3 lịch sắp tới + `ticker` của các tin + mảng `TICKER` (`{ text, until }` để tự ẩn).
- Ảnh, video Drive: thư mục Google Drive công khai, danh sách trong `media.js` và `media.json` ở gốc repo.
  GitHub Action `.github/workflows/drive-media.yml` quét Drive mỗi 15 phút; trang đọc lại `media.json` mỗi 5 phút. Thêm ảnh vào Drive là xong.
  Chạy tay khi cần gấp: tab Actions → "Cập nhật ảnh từ Google Drive" → Run workflow, hoặc `python3 tools/drive-media.py` rồi commit, push.
- Video iPhone (.MOV, HEVC) được Action chuyển sang H.264 MP4 720p trong `media/`. Giữ clip dưới 2 phút.
- Phím mũi tên phải, trái để chuyển tin, phím cách để chuyển ảnh trong tin Drive, F hoặc Enter để toàn màn hình. `tv/#2` mở thẳng tin số 2.
- Chrome kiosk: `chrome --kiosk "https://minhnhat0202-bit.github.io/vt.internal/tv/"`.

## Tin các phòng ban gửi lên (`news/`)

| Trang | Địa chỉ | Ai dùng |
|---|---|---|
| Gửi tin | `…/vt.internal/news/` | Các phòng ban: điền mẫu, đính kèm ảnh, có khung xem trước đúng giao diện TV |
| Duyệt tin | `…/vt.internal/news/duyet.html` | Ban Truyền thông: sửa câu chữ, xếp, bỏ ảnh, ghim, đặt ngày chiếu, duyệt, từ chối, gỡ |

- Đơn vị chọn tin hiện ở đâu: **Tin tiêu điểm** (tiêu đề + ảnh), **Lịch sự kiện** (3 khung phải), **Dòng chạy**; một tin có thể chọn nhiều nơi.
- Ảnh được thu về cạnh dài 1600 px JPG ngay trên máy người gửi, lưu vào thư mục Drive của Apps Script. Video gửi qua link, Ban Truyền thông xử lý tay như tin Daily News.
- Tin đã duyệt vào khung **Tin các phòng** (ảnh đầu tiên + tiêu đề + tên phòng). Tin admin chọn "Đưa lên khung lớn Tiêu điểm" thì chiếu cả bộ ảnh, đứng đầu khung lớn. Tin tự rời TV sau ngày "Chiếu đến hết ngày". Duyệt, sửa, gỡ xong thì TV tự tải lại trong khoảng 2 phút.
- Duyệt hoặc từ chối: nếu đơn vị để lại email, Apps Script gửi email báo kết quả kèm "Phản hồi cho đơn vị". Có tin mới: email về `ADMIN_EMAIL`, link mở thẳng tin đó (`duyet.html#<mã tin>`).
- **Cài máy chủ một lần:** làm theo 4 bước ở đầu `apps-script/news.gs`, rồi dán URL `/exec` vào `API_URL` trong `news/config.js`, commit, push.
  Khi `API_URL` còn trống, hai trang chạy ở **chế độ thử**: tin lưu trong trình duyệt đang mở, chỉ để xem thử trên một máy.
- Tin, ảnh nằm trong Google Sheet và Drive của tài khoản cài Apps Script, không nằm trong repo. Link ảnh dạng "ai có link đều xem được".

## Chế độ TV thẻ xoay vòng (`#slides`)

Mở `index.html#slides`: xoay vòng 5 thẻ poster, lịch thi đấu, số liệu đăng ký, sơ đồ thi đấu, đếm ngược liên hoan 23/10.

- Khung dựng ở 1920×1080 và tự thu phóng theo màn hình, cỡ chữ đọc được từ 3 đến 5 mét.
- Phím mũi tên trái phải để chuyển thẻ, Esc để thoát, `#slides3` mở thẳng thẻ số 3.
- Poster trên TV dùng bản cắt 16:9 `img/poster-tv-1920x1080.webp` (bỏ dải khói dưới cùng, giữ nguyên tiêu đề và nhân vật).

## Tự cập nhật trên TV

Bản tin TV tự kiểm tra `tv/index.html` và `tv/content.js` (trang Giải: `index.html`) trên máy chủ mỗi 2 phút, thấy khác bản đang chạy thì tự tải lại.
Vì vậy sau khi push lên GitHub, TV tự nhận bản mới trong vòng vài phút mà không cần ra bấm F5.
Trang cũng tự tải lại lúc 05:00 mỗi ngày để làm mới nội dung theo ngày và giải phóng bộ nhớ trình duyệt TV.
Chỉnh trong hằng `AUTO_RELOAD` (`checkSeconds`, `dailyAt`). Lần đầu áp dụng tính năng này vẫn phải F5 tay một lần vì bản đang chạy trên TV chưa có mã kiểm tra.

## Sửa nội dung trang Giải thể thao

- Lịch thi đấu: mảng `SCHEDULE` (mỗi mục có `label`, `from`, `to`, `time`, `final`).
- Số liệu PES và Bóng đá: `static` của môn đó trong `SCHEDULE`.
- Ngày liên hoan: hằng `FINALE`.
- Dòng chạy: hàm `renderToday()` sinh tự động từ lịch, câu cố định thêm ở mảng `msgs`.

## Deploy

Repo đã bật GitHub Pages (nhánh `main`, thư mục gốc). Commit và `git push` là xong, trang cập nhật sau 1 đến 2 phút, TV tự tải lại sau đó.

Font FS PF BeauSans Pro là font nội bộ theo bộ nhận diện Viettel 2024 (FS Magistral không còn được dùng). Nếu repo công khai, cân nhắc bỏ `fonts/FSPFBeauSansPro-*`; trang tự dùng Roboto thay thế.
