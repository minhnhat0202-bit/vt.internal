// Hộp thư tin các phòng ban cho Bản tin TV.
//   news/index.html  → submit   (ai cũng gửi được, tin vào hàng chờ)
//   news/duyet.html  → login, list, save, delete (cần ADMIN_KEY)
//   tv/index.html    → GET ?action=published (tin đã duyệt, đã bỏ thông tin liên hệ)
//   Nhạc giải lao (phần cuối file): news/index.html#nhac → music_submit; news/nhac.html → music_list, music_save, music_delete;
//   tv/music.js và trang gửi nhạc → GET ?action=music (danh sách phát buổi tới, chốt lúc 15:55); GET ?action=audio&id= (file nhạc base64).
// Tin lưu trong sheet "Tin" của Google Sheet chứa script này; ảnh lưu trong một thư mục Drive chia sẻ "ai có link đều xem được".
//
// CÀI ĐẶT (một lần, khoảng 10 phút):
// 1. Tạo Google Sheet mới (ví dụ "Bản tin TV · Tin phòng ban") → Tiện ích mở rộng → Apps Script → dán toàn bộ file này.
// 2. Cài đặt dự án (biểu tượng bánh răng) → Thuộc tính tập lệnh, thêm:
//      ADMIN_KEY   = mật khẩu trang duyệt (bắt buộc)
//      ADMIN_EMAIL = email nhận báo khi có tin mới (tuỳ chọn, nhiều email cách nhau dấu phẩy)
//      FOLDER_ID   = id thư mục Drive chứa ảnh (tuỳ chọn; để trống thì script tự tạo)
//      MUSIC_FOLDER_ID = id thư mục Drive chứa nhạc (tuỳ chọn; để trống thì script tự tạo)
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
  sheet_(); folder_(); mSheet_(); mFolder_();
  if (!prop_('ADMIN_KEY')) throw new Error('Chưa đặt ADMIN_KEY trong Thuộc tính tập lệnh');
  Logger.log('Xong. Thư mục ảnh: https://drive.google.com/drive/folders/' + prop_('FOLDER_ID'));
}

function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || 'published';
  if (a === 'published') return out_(published_());
  if (a === 'music') { try { return out_(musicPlan_()); } catch (x) { return out_({ ok: false, error: String(x && x.message || x) }); } }
  if (a === 'audio') { try { return out_(mAudio_(e.parameter.id)); } catch (x) { return out_({ ok: false, error: String(x && x.message || x) }); } }
  return out_({ ok: false, error: 'Thao tác không hỗ trợ' });
}

function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  try {
    if (p.action === 'submit') return out_(submit_(p));
    if (p.action === 'music_submit') return out_(mSubmit_(p));
    auth_(p.key);
    if (p.action === 'music_list') return out_({ ok: true, items: mRows_().map((x) => x.rec) });
    if (p.action === 'music_save') return out_(mSave_(p));
    if (p.action === 'music_delete') return out_(mDel_(p));
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

// =====================================================================
// NHẠC GIẢI LAO: mọi người gửi bài (news/index.html#nhac), Ban Truyền thông duyệt (news/nhac.html),
// TV phát trong khung MUSIC.start–MUSIC.end các ngày làm việc (tv/music.js).
// Bài lưu ở sheet "Nhạc", file ở thư mục Drive MUSIC_FOLDER_ID ("ai có link đều xem được").
// Danh sách phát tính lại mỗi lần hỏi cho tới lockMin phút trước giờ phát; lần hỏi đầu tiên sau đó chốt cố định
// (Thuộc tính tập lệnh MUSIC-<ngày>) và chuyển các bài được chọn sang "đã phát". TV không bật thì không chốt, bài giữ lượt.
// Nhạc dự phòng (fallback): bài Ban Truyền thông đánh dấu, không bao giờ hết lượt, dùng lấp cho đủ giờ.
// =====================================================================
const M_SHEET = 'Nhạc';
const M_COLS = ['id', 'createdAt', 'updatedAt', 'status', 'dept', 'title', 'artist', 'sender', 'json'];
const MUSIC = {
  start: '16:00', end: '16:30', days: [1, 2, 3, 4, 5], lockMin: 5, gap: 2,    // days: 0 = Chủ nhật; gap: giây nghỉ giữa hai bài
  maxB64: 14 * 1024 * 1024, maxSeconds: 360,                                  // file 10 MB (base64 ~13,4 MB), bài ≤ 6 phút
  perPersonDay: 1, perPersonWeek: 2, perDeptDay: 3, pendingPerPerson: 2,
  expireDays: 7, noRepeatDays: 14, keepDays: 60                               // chờ quá 7 ngày thì hết hạn; xoá file sau 60 ngày
};
const M_STATUSES = ['pending', 'approved', 'rejected', 'played', 'expired'];
const M_LIMITS = { dept: 80, sender: 60, contact: 80, title: 80, artist: 60, message: 90, note: 500 };
const AUDIO_TYPES = /^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac)$/;

function mSubmit_(p) {
  const r0 = p.record || {}, f = p.file || {};
  if (r0.website) return { ok: true, record: { id: 'OK' } };                // ô bẫy chống spam
  const r = mClean_(r0, false);
  if (!r.dept || !r.sender || !r.title) throw new Error('Thiếu phòng ban, người gửi hoặc tên bài');
  if (!f.data) throw new Error('Chưa có file nhạc');
  if (f.data.length > MUSIC.maxB64) throw new Error('File nhạc lớn quá 10 MB');
  r.duration = Math.round(+r0.duration || 0);
  if (!(r.duration > 0)) throw new Error('Không đọc được thời lượng bài');
  if (r.duration > MUSIC.maxSeconds) throw new Error('Bài dài quá ' + MUSIC.maxSeconds / 60 + ' phút');
  const who = person_(r);
  const mine = mRows_().filter((x) => x.rec.status === 'pending' && person_(x.rec) === who).length;
  if (mine >= MUSIC.pendingPerPerson) throw new Error('Anh/chị đang có ' + mine + ' bài chờ duyệt, đợi Ban Truyền thông duyệt xong rồi gửi tiếp');
  const now = new Date().toISOString();
  Object.assign(r, { id: mId_(), status: 'pending', createdAt: now, updatedAt: now, approvedAt: '', playedOn: '', pin: false, fallback: false, note: '' });
  const type = AUDIO_TYPES.test(f.type) ? f.type : 'audio/mpeg';
  const file = mFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(f.data), type, r.id + '-' + String(f.name || 'nhac.mp3').replace(/[^\w.\-]+/g, '_').slice(-80)));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) {}
  r.file = { id: file.getId(), type: type, size: file.getSize() };
  withLock_(() => mSheet_().appendRow(mRow_(r)));
  CacheService.getScriptCache().remove('music');
  const to = prop_('ADMIN_EMAIL');
  if (to) {
    try {
      MailApp.sendEmail(to, '[Nhạc giải lao] Bài mới chờ duyệt: ' + r.title + (r.artist ? ' · ' + r.artist : ''),
        'Đơn vị: ' + r.dept + '\nNgười gửi: ' + r.sender + ' ' + (r.contact || '') + '\nMã bài: ' + r.id + (r.message ? '\nLời nhắn: ' + r.message : '') +
        '\n\nVào trang duyệt nhạc: ' + (prop_('ADMIN_URL') || 'https://minhnhat0202-bit.github.io/vt.internal/news/duyet.html').replace(/duyet\.html.*$/, 'nhac.html') + '#' + r.id);
    } catch (x) {}
  }
  return { ok: true, record: { id: r.id } };
}

function mSave_(p) {
  return withLock_(() => {
    const found = mRows_().filter((x) => x.rec.id === (p.record && p.record.id))[0];
    if (!found) throw new Error('Không tìm thấy bài');
    const old = found.rec, r = Object.assign({}, old, mClean_(p.record, true));
    r.updatedAt = new Date().toISOString();
    if (r.status === 'approved' && old.status !== 'approved') r.approvedAt = r.updatedAt;
    mSheet_().getRange(found.row, 1, 1, M_COLS.length).setValues([mRow_(r)]);
    CacheService.getScriptCache().remove('music');
    let mailed = '';
    if (r.status !== old.status && (r.status === 'approved' || r.status === 'rejected') && !r.fallback) mailed = mNotify_(r);
    return { ok: true, record: r, mailed: mailed };
  });
}

function mDel_(p) {
  return withLock_(() => {
    const found = mRows_().filter((x) => x.rec.id === p.id)[0];
    if (!found) throw new Error('Không tìm thấy bài');
    if (found.rec.file && found.rec.file.id) try { DriveApp.getFileById(found.rec.file.id).setTrashed(true); } catch (x) {}
    mSheet_().deleteRow(found.row);
    CacheService.getScriptCache().remove('music');
    return { ok: true };
  });
}

// File nhạc dạng base64. Drive trả 403 khi trang ngoài (github.io) phát file trực tiếp, nên TV và trang duyệt lấy qua đây.
// Chỉ trả file của bài có trong sheet Nhạc (không mở cửa cho file Drive khác của chủ script).
function mAudio_(id) {
  const r = mRows_().map((x) => x.rec).filter((x) => x.id === id)[0];
  if (!r || !r.file || !r.file.id) throw new Error('Không tìm thấy file nhạc');
  const blob = DriveApp.getFileById(r.file.id).getBlob();
  return { ok: true, type: r.file.type || blob.getContentType() || 'audio/mpeg', data: Utilities.base64Encode(blob.getBytes()) };
}

// Danh sách phát buổi tới. TV gọi mỗi phút quanh giờ phát; trang gửi nhạc gọi để hiện hàng chờ.
function musicPlan_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('music');
  if (hit) return JSON.parse(hit);
  const now = new Date(), day = Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), min = hmMin_(Utilities.formatDate(now, TZ, 'HH:mm'));
  const target = isMusicDay_(day) && min < hmMin_(MUSIC.end) ? day : nextMusicDay_(day);
  const saved = prop_('MUSIC-' + target);
  let res;
  if (saved) res = planOut_(target, JSON.parse(saved), true, mRows_().map((x) => x.rec));
  else if (target === day && min >= hmMin_(MUSIC.start) - MUSIC.lockMin) res = withLock_(() => lockPlan_(target));
  else { const recs = mRows_().map((x) => x.rec); res = planOut_(target, plan_(target, recs), false, recs); }
  try { cache.put('music', JSON.stringify(res), 60); } catch (x) {}
  return res;
}

function lockPlan_(day) {
  const key = 'MUSIC-' + day, again = prop_(key);
  const rows = mRows_(), recs = rows.map((x) => x.rec);
  if (again) return planOut_(day, JSON.parse(again), true, recs);
  const plan = plan_(day, recs), props = PropertiesService.getScriptProperties();
  props.setProperty(key, JSON.stringify(plan));
  Object.keys(props.getProperties()).forEach((k) => { if (/^MUSIC-\d{4}-\d{2}-\d{2}$/.test(k) && k.slice(6) < addDay_(day, -7)) props.deleteProperty(k); });
  const picked = {}, now = new Date().toISOString(), sh = mSheet_();
  const expireBefore = addDay_(day, -MUSIC.expireDays), dropBefore = addDay_(day, -MUSIC.keepDays);
  plan.forEach((x) => { picked[x[0]] = 1; });
  rows.forEach((x) => {
    const r = x.rec; let ch = false;
    if (picked[r.id] && !r.fallback) { r.status = 'played'; r.playedOn = day; ch = true; }
    else if (r.status === 'approved' && !r.fallback && String(r.approvedAt || r.createdAt).slice(0, 10) < expireBefore) { r.status = 'expired'; ch = true; }
    if (!r.fallback && r.file && ['played', 'expired', 'rejected'].indexOf(r.status) > -1 && String(r.playedOn || r.updatedAt).slice(0, 10) < dropBefore) {
      try { DriveApp.getFileById(r.file.id).setTrashed(true); } catch (e) {}
      r.file = null; ch = true;
    }
    if (ch) { r.updatedAt = now; sh.getRange(x.row, 1, 1, M_COLS.length).setValues([mRow_(r)]); }
  });
  return planOut_(day, plan, true, recs);
}

// Xếp hàng: bài ghim trước; còn lại xen kẽ các phòng, mỗi vòng một bài/phòng, trong phòng bài duyệt trước phát trước.
// Bỏ qua (giữ lượt hôm sau) bài vượt giới hạn mỗi người/mỗi phòng, bài vừa phát trong noRepeatDays ngày, bài không còn đủ giờ.
// Trả về [[id, giây bắt đầu tính từ MUSIC.start], …]
function plan_(day, recs) {
  const total = (hmMin_(MUSIC.end) - hmMin_(MUSIC.start)) * 60;
  const recent = {}, week = {}, weekFrom = addDay_(day, -6), repFrom = addDay_(day, -MUSIC.noRepeatDays);
  recs.forEach((r) => {
    if (!r.playedOn || r.playedOn >= day || r.fallback) return;
    if (r.playedOn >= repFrom) recent[songKey_(r)] = 1;
    if (r.playedOn >= weekFrom) week[person_(r)] = (week[person_(r)] || 0) + 1;
  });
  const playable = (r) => r.status === 'approved' && r.file && r.file.id && r.duration > 0;
  const queue = recs.filter((r) => playable(r) && !r.fallback)
    .sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(a.approvedAt || a.createdAt).localeCompare(String(b.approvedAt || b.createdAt)));
  const mixed = queue.filter((r) => r.pin), byDept = {}, order = [];
  queue.filter((r) => !r.pin).forEach((r) => { if (!byDept[r.dept]) { byDept[r.dept] = []; order.push(r.dept); } byDept[r.dept].push(r); });
  for (let k = 0; order.some((d) => byDept[d].length > k); k++) order.forEach((d) => { if (byDept[d][k]) mixed.push(byDept[d][k]); });

  const out = [], day1 = {}, dept1 = {}, songs = {};
  let t = 0;
  const fits = (r) => t + r.duration <= total;
  const take = (r) => { out.push([r.id, t]); t += r.duration + MUSIC.gap; songs[songKey_(r)] = 1; };
  mixed.forEach((r) => {
    const who = person_(r), n = day1[who] || 0;
    if (!r.pin && (n >= MUSIC.perPersonDay || (week[who] || 0) + n >= MUSIC.perPersonWeek || (dept1[r.dept] || 0) >= MUSIC.perDeptDay)) return;
    if (recent[songKey_(r)] || songs[songKey_(r)] || !fits(r)) return;
    take(r); day1[who] = n + 1; dept1[r.dept] = (dept1[r.dept] || 0) + 1;
  });
  // lấp chỗ trống bằng nhạc dự phòng, xáo theo ngày, mỗi bài tối đa một lần; hết bài thì để im tới hết giờ
  shuffle_(recs.filter((r) => playable(r) && r.fallback), day).forEach((r) => { if (!songs[songKey_(r)] && fits(r)) take(r); });
  return out;
}

function planOut_(day, plan, locked, recs) {
  const byId = {}, picked = {};
  recs.forEach((r) => { byId[r.id] = r; });
  const items = plan.map((x) => {
    const r = byId[x[0]];
    if (!r || !r.file || !r.file.id) return null;
    picked[r.id] = 1;
    return { id: r.id, at: x[1], duration: r.duration, title: r.title, artist: r.artist || '', dept: r.dept, sender: r.fallback ? '' : r.sender,
      message: r.fallback ? '' : (r.message || ''), fallback: !!r.fallback, url: 'https://drive.google.com/uc?export=download&id=' + r.file.id };
  }).filter(Boolean);
  const waiting = recs.filter((r) => r.status === 'approved' && !r.fallback && !picked[r.id]).length;
  const pending = recs.filter((r) => r.status === 'pending').length;
  return { ok: true, day: day, start: MUSIC.start, end: MUSIC.end, locked: locked, items: items, waiting: waiting, pending: pending };
}

function mClean_(r, admin) {
  const o = {}, str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
  ['dept', 'sender', 'contact', 'title', 'artist', 'message'].forEach((k) => { o[k] = str(r[k], M_LIMITS[k]); });
  if (admin) {
    if (M_STATUSES.indexOf(r.status) > -1) o.status = r.status;
    o.pin = !!r.pin; o.fallback = !!r.fallback;
    o.note = str(r.note, M_LIMITS.note);
    if (+r.duration > 0) o.duration = Math.min(MUSIC.maxSeconds * 2, Math.round(+r.duration));
  }
  return o;
}

function mNotify_(r) {
  const to = r.contact || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return '';
  const name = r.title + (r.artist ? ' · ' + r.artist : '');
  const body = r.status === 'approved'
    ? 'Bài "' + name + '" (mã ' + r.id + ') đã được duyệt và vào hàng chờ phát giờ giải lao ' + MUSIC.start + '–' + MUSIC.end + ' trên TV Trung tâm. Bài thường lên sóng trong vài ngày làm việc tới.'
    : 'Bài "' + name + '" (mã ' + r.id + ') chưa được đưa vào danh sách phát.';
  try {
    MailApp.sendEmail(to, '[Nhạc giải lao] ' + (r.status === 'approved' ? 'Bài đã được duyệt' : 'Bài chưa được duyệt') + ': ' + name,
      'Chào ' + (r.sender || 'anh/chị') + ',\n\n' + body + (r.note ? '\n\nPhản hồi của Ban Truyền thông: ' + r.note : '') + '\n\nBan Truyền thông · TT Nền tảng Công nghệ & Chuyển đổi số');
    return to;
  } catch (x) { return ''; }
}

function mRows_() {
  const sh = mSheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const jsonCol = M_COLS.indexOf('json');
  return sh.getRange(2, 1, n, M_COLS.length).getValues()
    .map((v, k) => { try { return { row: k + 2, rec: JSON.parse(v[jsonCol]) }; } catch (x) { return null; } })
    .filter(Boolean).reverse();
}
function mRow_(r) { return M_COLS.map((c) => (c === 'json' ? JSON.stringify(r) : (r[c] == null ? '' : r[c]))); }
function mSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(M_SHEET);
  if (!sh) { sh = ss.insertSheet(M_SHEET); sh.appendRow(M_COLS); sh.setFrozenRows(1); sh.getRange('1:1').setFontWeight('bold'); sh.setColumnWidth(M_COLS.length, 400); }
  return sh;
}
function mFolder_() {
  const id = prop_('MUSIC_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const f = DriveApp.createFolder('Bản tin TV · Nhạc giải lao');
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) {}
  PropertiesService.getScriptProperties().setProperty('MUSIC_FOLDER_ID', f.getId());
  return f;
}
function mId_() { return 'N' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
function norm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ''); }
function person_(r) { return norm_(r.sender) + '|' + r.dept; }
function songKey_(r) { return norm_(r.title) + '|' + norm_(r.artist); }
function hmMin_(hm) { const a = String(hm).split(':'); return +a[0] * 60 + +a[1]; }
function addDay_(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function isMusicDay_(iso) { return MUSIC.days.indexOf(new Date(iso + 'T12:00:00Z').getUTCDay()) > -1; }
function nextMusicDay_(iso) { let d = iso; for (let i = 0; i < 8; i++) { d = addDay_(d, 1); if (isMusicDay_(d)) return d; } return d; }
function shuffle_(a, seed) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rnd = () => ((h = (h * 1103515245 + 12345) | 0) >>> 0) / 4294967296;
  a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
