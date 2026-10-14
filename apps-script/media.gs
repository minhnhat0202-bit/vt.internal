// Tùy chọn: Apps Script trả về danh sách ảnh, video của một thư mục Drive dạng JSON.
// Dùng khi muốn ảnh mới lên TV trong 1 đến 2 phút, hoặc thư mục Drive không công khai.
// Cài: script.google.com → New project → dán file này → Deploy → Web app (Execute as: Me, Who has access: Anyone)
// → copy URL dán vào hằng MEDIA_API_URL trong index.html. Ảnh vẫn phải xem được bởi người mở trang (thư mục công khai),
// vì trình duyệt tải ảnh trực tiếp từ Drive.
const FOLDER_ID = '18QdoAzINpvlfo54nMBTAGTn9avTo214E';

function doGet() {
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  const out = [];
  while (files.hasNext()) {
    const f = files.next(); const mime = f.getMimeType() || '';
    const type = mime.indexOf('image/') === 0 ? 'image' : mime.indexOf('video/') === 0 ? 'video' : '';
    if (type) out.push({ id: f.getId(), name: f.getName(), type: type, ts: f.getDateCreated().getTime() });
  }
  out.sort((a, b) => (a.name > b.name ? 1 : -1));
  return ContentService.createTextOutput(JSON.stringify({ ok: true, files: out })).setMimeType(ContentService.MimeType.JSON);
}
