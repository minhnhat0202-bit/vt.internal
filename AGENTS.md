# Repo vt.internal: Bản tin TV và trang Giải thể thao

Dành cho mọi agent (Claude Code, omp). Đọc file này trước, chỉ mở thêm file khác khi cần.

## Bản đồ
- `tv/content.js`: **toàn bộ nội dung bản tin TV** (tin tiêu điểm `STORIES`, lịch `AGENDA`, `TODAY`, dòng chạy `TICKER`). Hướng dẫn từng trường ở đầu file. Việc nội dung hằng ngày chỉ sửa file này.
- `tv/index.html`: giao diện và mã bản tin TV. Chỉ sửa khi đổi bố cục hoặc thêm kiểu tin mới.
- `index.html`: trang thống kê Giải thể thao (+ `#slides` thẻ xoay vòng). Độc lập với bản tin TV.
- `img/` ảnh, `media/` video H.264 MP4, `fonts/`, `media.js`/`media.json` (ảnh Drive, GitHub Action tự sinh, không sửa tay).
- `news/`: hộp thư tin các phòng ban. `index.html` = mẫu gửi tin (link gửi các phòng), `duyet.html` = trang Ban Truyền thông duyệt, `config.js` = URL Apps Script + danh sách phòng ban + giới hạn ký tự, `shared.js` = chuyển tin đã duyệt sang định dạng STORIES/AGENDA/TICKER (TV cũng nạp file này), `form.js` + `news.css` = khung nhập dùng chung.
- `apps-script/news.gs`: máy chủ của `news/` (Google Sheet + thư mục ảnh Drive). Cách cài ghi ở đầu file.
- `TRUYEN-THONG.md`: hướng dẫn chi tiết cho người vận hành.

## Deploy
GitHub Pages, nhánh `main`. `git push` = deploy, 1 đến 2 phút. TV tự tải lại khi `tv/index.html` hoặc `tv/content.js` đổi.
- Bản tin TV: https://minhnhat0202-bit.github.io/vt.internal/tv/
- Trang Giải: https://minhnhat0202-bit.github.io/vt.internal/

## Công thức hay dùng
- **Thêm tin Daily News:** ảnh vào `img/daily-YYYY-MM-DD[-n].jpg` (cạnh dài ≤ 1600, JPG: `sips -Z 1600 -s format jpeg in --out out.jpg`), video vào `media/daily-YYYY-MM-DD[-n].mp4` (H.264 MP4; **bắt buộc tiền tố `daily-`**, tên khác có thể bị GitHub Action dọn mất), rồi thêm một mục vào `STORIES` trong `tv/content.js`, `tab` là **tên nhóm**: Đời sống, Kinh doanh, Công nghệ, Phong trào hoặc Sự kiện (mô tả nhóm ở `GROUPS` trong `news/config.js`; thanh tab TV chỉ hiện nhóm, mỗi tin một đoạn vạch). Đặt `until` nếu tin chỉ chiếu vài ngày.
- **Ảnh thiết kế riêng cho khung Tin tiêu điểm (poster, thư mời…):** khung ảnh (`.media`) trên TV 1920×1080 là **1232×647** khi tin không có `tag`/`sub` (có thì còn 1232×609–615), tức tỷ lệ ~1.9:1, **không phải 16:9**; ảnh hiện bằng `object-fit: contain` nên ảnh 16:9 bị hở hai bên. Dựng ảnh ở **1920×1008** (skill vt-design-7styles: `render_artwork.py ... --product social --size tv-story`), giữ lề trong ≥ 32 px (khung bo góc 20 px), không đặt `tag`/`sub` cho tin đó, rồi `sips -Z 1600` → 1600×840. Ảnh kín cả màn hình (BACKDROP) thì vẫn 1920×1080.
- **Thêm kết quả một môn:** poster vào `img/ket-qua-<mon>.jpg`, thêm `{ src, sub: 'Môn · Vô địch: …' }` vào `slides` của tin `id: 'ket-qua'`, thêm câu vào `ticker` của tin đó. Không tạo tab riêng cho từng môn.
- **Tin các phòng gửi qua `news/`:** không sửa `content.js`; admin duyệt ở `news/duyet.html`, TV tự nhận trong khoảng 2 phút. Tin được "Ghim lên đầu Tin tiêu điểm" (`pin`) vào đầu `STORIES`, tin thường (`DEPT_NEWS`) chiếu nối cuối Tin tiêu điểm (không còn khung Tin các phòng; mã QR gửi tin ở đầu phải dòng chạy Đừng bỏ lỡ). Thêm hoặc đổi tên phòng ban: sửa `DEPARTMENTS` trong `news/config.js` (`short` = tên hiện trên TV).
- **Gộp tin phòng ban (news/) vào một tin trong STORIES:** tải ảnh của tin đó (`curl -sL '<API_URL>?action=published'`, lấy `images[].url` của đúng `id`) về `img/daily-…jpg`, thêm vào `slides` của tin gộp, rồi thêm `id` tin phòng ban vào `HIDE_NEWS` trong `tv/content.js` để TV không chiếu bản ghim riêng nữa.
- **Backdrop sự kiện (ảnh kín màn hình TV vài giờ):** ảnh vào `img/backdrop-YYYY-MM-DD.jpg` (`sips -Z 1920 -s format jpeg`), sửa `BACKDROP` trong `tv/content.js`: `{ src, from: 'YYYY-MM-DDTHH:MM', until: 'YYYY-MM-DDTHH:MM' }` (giờ Việt Nam). Nhiều ảnh chuyển lần lượt: `src: ['img/a.jpg', 'img/b.jpg'], seconds: 7`; ảnh không phải 16:9 thì cắt về 16:9 trước (TV phủ kín bằng object-fit cover). Thay ảnh trùng tên thì thêm `?v=n` để TV không dùng bản cũ. Hết giờ tự ẩn, không cần gỡ; muốn tắt sớm thì đặt `BACKDROP: null`.
- **Châm ngôn (khung Hôm nay khi không có lịch, ngẫu nhiên, `QUOTE_SECONDS` = 60 giây đổi câu):** nguồn là Google Sheet trong `QUOTES_SHEET` (`tv/content.js`), cột STT hoặc Ngày dd/mm/yyyy | Câu | Tác giả. Thêm, sửa câu: sửa thẳng Sheet, không cần commit. `QUOTES` chỉ là câu dự phòng.
- **Đổi lịch khung bên phải:** sửa `AGENDA` (có `to` = giai đoạn, không `to` = sự kiện một ngày).

## Kiểm tra trước khi commit
1. `node -e "global.window={};require('./tv/content.js');console.log(window.TV.STORIES.length)"` không lỗi cú pháp.
2. Mọi `src` mới trong `content.js` tồn tại trong repo (`ls img/... media/...`) và đã `git add`.
3. Nếu sửa `news/*.js`: `node --check` từng file. `API_URL` trống = chế độ thử (lưu trong trình duyệt); xem trước TV: `tv/?preview=1`.
4. Nếu sửa giao diện: `python3 -m http.server 8765` rồi chụp Chrome headless `--window-size=1920,1080` trang `http://localhost:8765/tv/#<số tin>`.

## Quy ước
- Chỉ 5 màu Viettel (EE0033, 000000, 44494D, B5B4B4, F2F2F2) và tint. Font FS PF BeauSans Pro (tiêu đề) + Roboto (nội dung).
- Commit message tiếng Việt, ngắn, nói thay đổi gì. Không commit file trong `Daily News/` (nằm ngoài repo).
