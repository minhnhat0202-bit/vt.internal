# Dashboard truyền thông Giải thể thao 2026

Thư mục này là một trang web tĩnh độc lập, không cần build, đẩy nguyên thư mục lên GitHub là chạy.
`index.html` là trang bản tin của Giải, đọc số liệu trực tiếp từ Google Apps Script của trang đăng ký.

```
index.html          trang bản tin, kèm chế độ TV (#tv)
img/                poster đã xử lý (web 2400 và 1200, bản cắt 16:9 cho TV, poster lịch thi đấu), logo
fonts/              FS Magistral (tiêu đề), Roboto (thân bài)
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
| Chế độ TV | Thêm `#tv` vào link | 5 thẻ xoay vòng, 12 đến 15 giây/thẻ |

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

## Chế độ TV

Mở `index.html#tv` trên trình duyệt của thiết bị phát, trang tự vào toàn màn hình và xoay vòng 5 thẻ:
poster, lịch thi đấu, số liệu đăng ký, sơ đồ thi đấu, đếm ngược liên hoan 23/10. Dòng chạy phía dưới lấy lịch của hôm nay và 3 lịch kế tiếp.

- Khung dựng ở 1920×1080 và tự thu phóng theo màn hình, cỡ chữ đọc được từ 3 đến 5 mét.
- Phím mũi tên trái phải để chuyển thẻ, Esc để thoát, `#tv3` mở thẳng thẻ số 3.
- Poster trên TV dùng bản cắt 16:9 `img/poster-tv-1920x1080.webp` (bỏ dải khói dưới cùng, giữ nguyên tiêu đề và nhân vật).
- Chrome kiosk: `chrome --kiosk "https://<tai-khoan>.github.io/<repo>/#tv"`.

## Sửa nội dung

- Lịch thi đấu: mảng `SCHEDULE` (mỗi mục có `label`, `from`, `to`, `time`, `final`).
- Số liệu PES và Bóng đá: `static` của môn đó trong `SCHEDULE`.
- Ngày liên hoan: hằng `FINALE`.
- Dòng chạy: hàm `renderToday()` sinh tự động từ lịch, câu cố định thêm ở mảng `msgs`.

## Đẩy lên GitHub Pages

1. Tạo repo mới, ví dụ `dashboard-giai-the-thao`, đẩy toàn bộ thư mục này lên nhánh `main`.
2. Repo → Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save.
3. Sau 1 đến 2 phút trang có tại `https://<tai-khoan>.github.io/dashboard-giai-the-thao/`, chế độ TV thêm `#tv`.

Font FS Magistral là font thương mại dùng nội bộ theo bộ nhận diện Viettel. Nếu repo công khai, cân nhắc bỏ `fonts/FSMagistral-*.ttf`; trang tự dùng Roboto thay thế.
