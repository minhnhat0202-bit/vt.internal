# Dashboard truyền thông Giải thể thao 2026

Thư mục này là một trang web tĩnh độc lập, không cần build, đẩy nguyên thư mục lên GitHub là chạy.
`index.html` là trang bản tin của Giải, đọc số liệu trực tiếp từ Google Apps Script của trang đăng ký.

```
index.html          trang bản tin, kèm 2 chế độ TV: bản tin (#tv) và thẻ xoay vòng (#slides)
media.js, media.json  danh sách ảnh, video từ thư mục Google Drive cho khung Tin tiêu điểm
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
| Chế độ TV bản tin | Thêm `#tv` vào link | Ảnh, video từ Drive xoay vòng; 3 khung Hôm nay có gì, Đang diễn ra, Sắp diễn ra tự lấy theo ngày |
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

## Chế độ TV bản tin (`#tv`)

Mở `index.html#tv` trên thiết bị phát, hoặc dùng địa chỉ ngắn `…/vt.internal/tv` (thư mục `tv/` chỉ chứa trang chuyển hướng sang `#tv`). Bố cục một màn hình cố định: thanh tiêu đề có ngày giờ, khung **Tin tiêu điểm** bên trái
(tiêu đề ngày + ảnh và video xoay vòng), 3 khung bên phải **Hôm nay có gì**, **Đang diễn ra**, **Sắp diễn ra**, dòng chạy phía dưới.

- Tiêu đề và mục thêm tay cho "Hôm nay có gì": hằng `DASH` trong `index.html` (`headline`, `subline`, `today`, số giây mỗi ảnh, giới hạn video, xáo thứ tự).
- Thẻ mở đầu mỗi vòng chiếu: `DASH.intro` (ảnh 16:9 trong `img/` và số giây), có hiệu ứng pháo hoa hạt vẽ bằng canvas. Đổi ảnh khác cho ngày khác hoặc đặt `intro: null` để bỏ.
- "Hôm nay có gì" lấy lịch bắt đầu hoặc kết thúc đúng hôm nay; "Đang diễn ra" là giai đoạn hiện tại của từng bộ môn kèm tiến độ trận từ hệ thống;
  "Sắp diễn ra" là 4 lịch gần nhất kèm số ngày còn lại. Tất cả tự đổi theo ngày.
- Ảnh và video lấy từ thư mục Google Drive công khai (hằng `DRIVE_FOLDER_ID`). Danh sách file nằm trong `media.js` và `media.json`.
  **Tự đồng bộ:** GitHub Action `.github/workflows/drive-media.yml` quét thư mục Drive mỗi 15 phút và commit danh sách mới;
  trang trên TV đọc lại `media.json` mỗi 5 phút và chèn ảnh mới vào lượt chiếu, không tải lại trang. Thêm ảnh vào Drive là xong,
  không cần làm gì thêm (độ trễ 15 đến 25 phút). Chạy tay khi cần gấp: tab Actions trên GitHub → "Cập nhật ảnh từ Google Drive" → Run workflow,
  hoặc `python3 tools/drive-media.py` rồi commit và push.
  Muốn nhanh hơn (1 đến 2 phút) hoặc thư mục Drive không công khai: cài `apps-script/media.gs` theo hướng dẫn trong file, dán URL vào `MEDIA_API_URL`.
- Ảnh hiện qua đường dẫn thumbnail của Drive nên cả HEIC từ iPhone cũng hiển thị được.
- Video iPhone (.MOV, mã HEVC) trình duyệt thường không phát được, nên GitHub Action chuyển mỗi video mới sang H.264 MP4 720p và lưu vào `media/`;
  trang phát file này. Video chưa kịp chuyển mã thì thử phát thẳng từ Drive, không được thì tự bỏ qua sau 15 giây.
  Video dài làm repo nặng, nên giữ clip ngắn dưới 2 phút.
- Phím mũi tên phải để chuyển ảnh, Esc để thoát.

## Chế độ TV thẻ xoay vòng (`#slides`)

Mở `index.html#slides`: xoay vòng 5 thẻ poster, lịch thi đấu, số liệu đăng ký, sơ đồ thi đấu, đếm ngược liên hoan 23/10.

- Khung dựng ở 1920×1080 và tự thu phóng theo màn hình, cỡ chữ đọc được từ 3 đến 5 mét.
- Phím mũi tên trái phải để chuyển thẻ, Esc để thoát, `#slides3` mở thẳng thẻ số 3.
- Poster trên TV dùng bản cắt 16:9 `img/poster-tv-1920x1080.webp` (bỏ dải khói dưới cùng, giữ nguyên tiêu đề và nhân vật).
- Chrome kiosk: `chrome --kiosk "https://<tai-khoan>.github.io/<repo>/#tv"`.

## Tự cập nhật trên TV

Trang tự kiểm tra `index.html` trên máy chủ mỗi 2 phút, thấy khác bản đang chạy thì tự tải lại.
Vì vậy sau khi push lên GitHub, TV tự nhận bản mới trong vòng vài phút mà không cần ra bấm F5.
Trang cũng tự tải lại lúc 05:00 mỗi ngày để làm mới nội dung theo ngày và giải phóng bộ nhớ trình duyệt TV.
Chỉnh trong hằng `AUTO_RELOAD` (`checkSeconds`, `dailyAt`). Lần đầu áp dụng tính năng này vẫn phải F5 tay một lần vì bản đang chạy trên TV chưa có mã kiểm tra.

## Sửa nội dung

- Lịch thi đấu: mảng `SCHEDULE` (mỗi mục có `label`, `from`, `to`, `time`, `final`).
- Số liệu PES và Bóng đá: `static` của môn đó trong `SCHEDULE`.
- Ngày liên hoan: hằng `FINALE`.
- Dòng chạy: hàm `renderToday()` sinh tự động từ lịch, câu cố định thêm ở mảng `msgs`.

## Đẩy lên GitHub Pages

1. Tạo repo mới, ví dụ `dashboard-giai-the-thao`, đẩy toàn bộ thư mục này lên nhánh `main`.
2. Repo → Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save.
3. Sau 1 đến 2 phút trang có tại `https://<tai-khoan>.github.io/dashboard-giai-the-thao/`, chế độ TV bản tin thêm `#tv`, thẻ xoay vòng thêm `#slides`.

Font FS PF BeauSans Pro là font nội bộ theo bộ nhận diện Viettel 2024 (FS Magistral không còn được dùng). Nếu repo công khai, cân nhắc bỏ `fonts/FSPFBeauSansPro-*`; trang tự dùng Roboto thay thế.
