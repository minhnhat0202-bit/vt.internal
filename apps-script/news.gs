// Hộp thư tin các phòng ban cho Bản tin TV.
//   news/index.html  → submit   (ai cũng gửi được, tin vào hàng chờ)
//   news/duyet.html  → login, list, save, delete (cần ADMIN_KEY)
//   tv/index.html    → GET ?action=published (tin đã duyệt, đã bỏ thông tin liên hệ)
// Tin lưu trong sheet "Tin" của Google Sheet chứa script này; ảnh lưu trong một thư mục Drive chia sẻ "ai có link đều xem được".
//
// CÀI ĐẶT (một lần, khoảng 10 phút):
// 1. Tạo Google Sheet mới (ví dụ "Bản tin TV · Tin phòng ban") → Tiện ích mở rộng → Apps Script → dán toàn bộ file này.
// 2. Cài đặt dự án (biểu tượng bánh răng) → Thuộc tính tập lệnh, thêm:
//      ADMIN_KEY   = mật khẩu trang duyệt (bắt buộc)
//      ADMIN_EMAIL = email nhận báo khi có tin mới (tuỳ chọn, nhiều email cách nhau dấu phẩy)
//      FOLDER_ID   = id thư mục Drive chứa ảnh (tuỳ chọn; để trống thì script tự tạo)
// 3. Chọn hàm setup → Chạy → cấp quyền Sheet, Drive, Gmail.
// 4. Triển khai → Tùy chọn triển khai mới → Ứng dụng web: Thực thi với tư cách "Tôi", Người có quyền truy cập "Bất kỳ ai"
//    → chép URL kết thúc bằng /exec, dán vào API_URL trong news/config.js, commit + push.
// Sửa script sau này: Triển khai → Quản lý → sửa bản đang chạy → Phiên bản mới (giữ nguyên URL).

const SHEET = 'Tin';
const COLS = ['id', 'createdAt', 'updatedAt', 'status', 'dept', 'title', 'sender', 'contact', 'json'];
const TZ = 'Asia/Ho_Chi_Minh';
const MAX_IMAGES = 8, MAX_IMAGE_B64 = 4 * 1024 * 1024;
const PRIVATE = ['sender', 'contact', 'message', 'note', 'videoLink'];
const STATUSES = ['pending', 'approved', 'rejected', 'archived'];
const LIMITS = { dept: 80, sender: 60, contact: 80, title: 60, tab: 22, tag: 14, sub: 70, videoLink: 500, ticker: 160, message: 500, note: 500,
  'event.title': 48, 'event.time': 20, 'event.place': 40 };

function setup() {
  sheet_(); folder_();
  if (!prop_('ADMIN_KEY')) throw new Error('Chưa đặt ADMIN_KEY trong Thuộc tính tập lệnh');
  Logger.log('Xong. Thư mục ảnh: https://drive.google.com/drive/folders/' + prop_('FOLDER_ID'));
}

function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || 'published';
  if (a === 'published') return out_(published_());
  return out_({ ok: false, error: 'Thao tác không hỗ trợ' });
}

function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  try {
    if (p.action === 'submit') return out_(submit_(p));
    auth_(p.key);
    if (p.action === 'login') return out_({ ok: true });
    if (p.action === 'list') return out_({ ok: true, items: rows_().map((x) => x.rec) });
    if (p.action === 'save') return out_(save_(p));
    if (p.action === 'delete') return out_(del_(p));
    return out_({ ok: false, error: 'Thao tác không hỗ trợ' });
  } catch (x) {
    return out_({ ok: false, error: String(x && x.message || x) });
  }
}

// ---------- thao tác ----------
function submit_(p) {
  const r0 = p.record || {};
  if (r0.website) return { ok: true, record: { id: 'OK' } };                // ô bẫy chống spam
  const files = (p.files || []).slice(0, MAX_IMAGES);
  const r = clean_(r0, false);
  const now = new Date().toISOString();
  r.id = newId_(); r.status = 'pending'; r.createdAt = now; r.updatedAt = now; r.pin = false; r.note = '';
  r.images = placeImages_(r0.images, files, r.id);
  withLock_(() => sheet_().appendRow(toRow_(r)));
  const to = prop_('ADMIN_EMAIL');
  if (to) {
    try {
      MailApp.sendEmail(to, '[Bản tin TV] Tin mới chờ duyệt: ' + (r.title || (r.event && r.event.title) || r.ticker || r.id),
        'Đơn vị: ' + r.dept + '\nNgười gửi: ' + r.sender + ' ' + (r.contact || '') + '\nMã tin: ' + r.id + '\n\nVào trang duyệt để xem: ' + (prop_('ADMIN_URL') || 'https://minhnhat0202-bit.github.io/vt.internal/news/duyet.html') + '#' + r.id);
    } catch (x) {}
  }
  return { ok: true, record: { id: r.id } };
}

function save_(p) {
  return withLock_(() => {
    const found = rows_().filter((x) => x.rec.id === (p.record && p.record.id))[0];
    if (!found) throw new Error('Không tìm thấy tin');
    const old = found.rec, r = Object.assign({}, old, clean_(p.record, true));
    r.id = old.id; r.createdAt = old.createdAt; r.updatedAt = new Date().toISOString();
    r.images = placeImages_(p.record.images || old.images, (p.files || []).slice(0, MAX_IMAGES), r.id).slice(0, MAX_IMAGES);
    sheet_().getRange(found.row, 1, 1, COLS.length).setValues([toRow_(r)]);
    CacheService.getScriptCache().remove('published');
    let mailed = '';
    if (r.status !== old.status && (r.status === 'approved' || r.status === 'rejected')) mailed = notify_(r);
    return { ok: true, record: r, mailed: mailed };
  });
}

function del_(p) {
  return withLock_(() => {
    const found = rows_().filter((x) => x.rec.id === p.id)[0];
    if (!found) throw new Error('Không tìm thấy tin');
    (found.rec.images || []).forEach((i) => { if (i.id) try { DriveApp.getFileById(i.id).setTrashed(true); } catch (x) {} });
    sheet_().deleteRow(found.row);
    CacheService.getScriptCache().remove('published');
    return { ok: true };
  });
}

// TV gọi mỗi 2 phút; đệm 60 giây cho đỡ tốn hạn mức
function published_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('published');
  if (hit) return JSON.parse(hit);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const items = rows_().map((x) => x.rec)
    .filter((r) => r.status === 'approved' && (!r.showUntil || r.showUntil >= today))
    .map((r) => { const o = {}; Object.keys(r).forEach((k) => { if (PRIVATE.indexOf(k) < 0) o[k] = r[k]; }); return o; });
  const res = { ok: true, items: items };
  try { cache.put('published', JSON.stringify(res), 60); } catch (x) {}
  return res;
}

// ---------- tiện ích ----------
function clean_(r, admin) {
  const o = {};
  const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
  const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');
  ['dept', 'sender', 'contact', 'title', 'tab', 'tag', 'sub', 'videoLink', 'ticker', 'message'].forEach((k) => { o[k] = str(r[k], LIMITS[k]); });
  if (o.videoLink && !/^https?:\/\//i.test(o.videoLink)) o.videoLink = '';
  const w = r.where || {};
  o.where = { story: !!w.story, agenda: !!w.agenda, ticker: !!w.ticker };
  const ev = r.event || {};
  o.event = { title: str(ev.title, LIMITS['event.title']), from: day(ev.from), to: day(ev.to), time: str(ev.time, LIMITS['event.time']), place: str(ev.place, LIMITS['event.place']) };
  o.showFrom = day(r.showFrom); o.showUntil = day(r.showUntil);
  if (admin) {
    if (STATUSES.indexOf(r.status) > -1) o.status = r.status;
    o.pin = !!r.pin;
    o.slideSeconds = Math.max(0, Math.min(30, +r.slideSeconds || 0)) || '';
    o.note = str(r.note, LIMITS.note);
  }
  return o;
}

// images: giữ thứ tự người dùng xếp; { new: k } = ảnh mới files[k] cần tải lên Drive.
// Ảnh cũ chỉ nhận lại nếu là ảnh Drive (không cho chèn link ngoài).
function placeImages_(list, files, id) {
  const folder = files.length ? folder_() : null;
  return (list || []).map((i, n) => {
    if (i && i['new'] !== undefined) {
      const f = files[i['new']];
      if (!f || !f.data || f.data.length > MAX_IMAGE_B64) return null;
      const type = /^image\/(jpeg|png|webp)$/.test(f.type) ? f.type : 'image/jpeg';
      const blob = Utilities.newBlob(Utilities.base64Decode(f.data), type, id + '-' + (n + 1) + '-' + String(f.name || 'anh.jpg').replace(/[^\w.\-]+/g, '_'));
      const file = folder.createFile(blob);
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) {}
      return { id: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600', w: +f.w || 0, h: +f.h || 0 };
    }
    if (i && i.id && /^[\w-]{10,}$/.test(i.id)) return { id: i.id, url: 'https://drive.google.com/thumbnail?id=' + i.id + '&sz=w1600', w: +i.w || 0, h: +i.h || 0 };
    return null;
  }).filter(Boolean);
}

function notify_(r) {
  const to = r.contact || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return '';
  const name = r.title || (r.event && r.event.title) || r.ticker || r.id;
  const body = r.status === 'approved'
    ? 'Tin "' + name + '" (mã ' + r.id + ') đã được duyệt, chiếu trên Bản tin TV từ ' + vn_(r.showFrom) + ' đến hết ' + vn_(r.showUntil) + '.'
    : 'Tin "' + name + '" (mã ' + r.id + ') chưa được đưa lên Bản tin TV.';
  try {
    MailApp.sendEmail(to, '[Bản tin TV] ' + (r.status === 'approved' ? 'Tin đã được duyệt' : 'Tin chưa được duyệt') + ': ' + name,
      'Chào ' + (r.sender || 'anh/chị') + ',\n\n' + body + (r.note ? '\n\nPhản hồi của Ban Truyền thông: ' + r.note : '') + '\n\nBan Truyền thông · TT Nền tảng Công nghệ & Chuyển đổi số');
    return to;
  } catch (x) { return ''; }
}

function rows_() {
  const sh = sheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const jsonCol = COLS.indexOf('json');
  return sh.getRange(2, 1, n, COLS.length).getValues()
    .map((v, k) => { try { return { row: k + 2, rec: JSON.parse(v[jsonCol]) }; } catch (x) { return null; } })
    .filter(Boolean).reverse();                                              // mới nhất lên đầu
}
function toRow_(r) { return COLS.map((c) => (c === 'json' ? JSON.stringify(r) : c === 'title' ? (r.title || (r.event && r.event.title) || r.ticker || '') : (r[c] == null ? '' : r[c]))); }
function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(COLS); sh.setFrozenRows(1); sh.getRange('1:1').setFontWeight('bold'); sh.setColumnWidth(COLS.length, 400); }
  return sh;
}
function folder_() {
  const id = prop_('FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const f = DriveApp.createFolder('Bản tin TV · Ảnh tin phòng ban');
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) {}
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', f.getId());
  return f;
}
function auth_(k) {
  const want = prop_('ADMIN_KEY');
  if (!want) throw new Error('Máy chủ chưa đặt ADMIN_KEY');
  if (String(k || '') !== want) { Utilities.sleep(800); throw new Error('Sai mật khẩu'); }
}
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function withLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
function newId_() { return 'T' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
function vn_(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '?'; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
