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
- **Thêm tin Daily News:** ảnh vào `img/daily-YYYY-MM-DD[-n].jpg` (cạnh dài ≤ 1600, JPG: `sips -Z 1600 -s format jpeg in --out out.jpg`), video vào `media/daily-YYYY-MM-DD[-n].mp4` (H.264 MP4; **bắt buộc tiền tố `daily-`**, tên khác có thể bị GitHub Action dọn mất), rồi thêm một mục vào `STORIES` trong `tv/content.js`. Đặt `until` nếu tin chỉ chiếu vài ngày.
- **Thêm kết quả một môn:** poster vào `img/ket-qua-<mon>.jpg`, thêm `{ src, sub: 'Môn · Vô địch: …' }` vào `slides` của tin `id: 'ket-qua'`, thêm câu vào `ticker` của tin đó. Không tạo tab riêng cho từng môn.
- **Tin các phòng gửi qua `news/`:** không sửa `content.js`; admin duyệt ở `news/duyet.html`, TV tự nhận trong khoảng 2 phút. Thêm hoặc đổi tên phòng ban: sửa `DEPARTMENTS` trong `news/config.js` (`short` = tên hiện trên TV).
- **Đổi lịch 3 khung phải:** sửa `AGENDA` (có `to` = giai đoạn, không `to` = sự kiện một ngày).

## Kiểm tra trước khi commit
1. `node -e "global.window={};require('./tv/content.js');console.log(window.TV.STORIES.length)"` không lỗi cú pháp.
2. Mọi `src` mới trong `content.js` tồn tại trong repo (`ls img/... media/...`) và đã `git add`.
3. Nếu sửa `news/*.js`: `node --check` từng file. `API_URL` trống = chế độ thử (lưu trong trình duyệt); xem trước TV: `tv/?preview=1`.
4. Nếu sửa giao diện: `python3 -m http.server 8765` rồi chụp Chrome headless `--window-size=1920,1080` trang `http://localhost:8765/tv/#<số tin>`.

## Quy ước
- Chỉ 5 màu Viettel (EE0033, 000000, 44494D, B5B4B4, F2F2F2) và tint. Font FS PF BeauSans Pro (tiêu đề) + Roboto (nội dung).
- Commit message tiếng Việt, ngắn, nói thay đổi gì. Không commit file trong `Daily News/` (nằm ngoài repo).
