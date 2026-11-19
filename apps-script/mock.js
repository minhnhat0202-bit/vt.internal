// Máy chủ giả để thử news.gs trên máy, không đụng Google Sheet/Drive thật. Chỉ dùng khi sửa news.gs (không triển khai lên đâu cả).
//   const g = require('./mock')();                     // nạp apps-script/news.gs với dịch vụ Google giả
//   g.time('2026-11-18T03:00:00Z');                    // đặt giờ giả cho script (10:00 giờ Việt Nam)
//   g.add('Tên bài', 'Ca sĩ', 'Phòng', 'Người gửi');   // gửi + duyệt một bài (240 giây); tham số thứ 5: { pin, fallback, ... }
//   g.plan();                                          // GET ?action=music
//   g.post({ action: 'music_list', key: 'test' });     // lệnh POST bất kỳ; mật khẩu trang duyệt giả là 'test'
//   g.share('FOLDERID', [{ name: 'a.mp4', type: 'video/mp4', size: 9e6 }]) // giả một thư mục (hoặc file, khi mảng 1 phần tử và folder=false) Drive của người gửi
// Ví dụ chạy nhanh: node apps-script/mock.js  (in danh sách phát của một kịch bản mẫu)
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function (file) {
  file = file || path.join(__dirname, 'news.gs');
  let offset = 0; const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + offset); } static now() { return RealDate.now() + offset; } }
  const sheets = {}, files = {}, props = { ADMIN_KEY: 'test' }, mails = [];
  const mk = (n) => { const rows = []; return sheets[n] = { appendRow: (r) => rows.push(r.slice()), setFrozenRows() {}, setColumnWidth() {}, getLastRow: () => rows.length,
    getRange(r, c, nr, nc) { if (typeof r === 'string') return { setFontWeight() {} }; return { getValues: () => rows.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc)), setValues: (v) => v.forEach((x, i) => { rows[r - 1 + i] = x.slice(); }) }; },
    deleteRow: (r) => rows.splice(r - 1, 1) }; };
  let fid = 0; const folder = { getId: () => 'FOLDER', setSharing() {}, createFile(b) { const id = 'F' + (++fid) + 'xxxxxxxxxx'; files[id] = b; return { getId: () => id, getSize: () => b.bytes.length, setSharing() {} }; } };
  const shared = {};   // thư mục, file Drive của người gửi: id → { folder: true, files: [...] } | file
  const fileObj = (id) => { const f = files[id]; if (!f) throw new Error('Không có quyền truy cập'); return { getId: () => id, getName: () => f.name, getMimeType: () => f.type, getSize: () => f.size || (f.bytes ? f.bytes.length : 0),
    setTrashed(t) { f.trashed = t; }, getBlob: () => ({ getBytes: () => f.bytes, getContentType: () => f.type }),
    makeCopy(name) { if (f.noCopy) throw new Error('copy'); const nid = 'V' + (++fid) + 'xxxxxxxxxx'; files[nid] = Object.assign({}, f, { name, copyOf: id }); return fileObj(nid); } }; };
  const ctx = { console, JSON, Math, String, Object, Array, Error, Date: FakeDate,
    SpreadsheetApp: { getActive: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: mk }) },
    DriveApp: { Access: {}, Permission: {}, createFolder: () => folder, getFolderById: () => folder,
      getFileById: (id) => fileObj(id), getFileByIdAndResourceKey: (id) => fileObj(id),
      getFolderById: (id) => { if (!shared[id]) return folder; const ks = shared[id].slice(); return { getFiles: () => ({ hasNext: () => ks.length > 0, next: () => fileObj(ks.shift()) }) }; } },
    UrlFetchApp: { fetch(url, o) { const id = decodeURIComponent((/files\/([^?]+)/.exec(url) || ['', ''])[1]), f = files[id], m = /bytes=(\d+)-(\d+)/.exec((o.headers || {}).Range || '');
      if (!f) return { getResponseCode: () => 404, getContent: () => [] }; const all = Buffer.alloc(f.size || 0, 7); return { getResponseCode: () => 206, getContent: () => all.subarray(+m[1], +m[2] + 1) }; } },
    ScriptApp: { getOAuthToken: () => 'token' },
    Utilities: { formatDate(d, tz, f) { const x = new RealDate(d.getTime() + 7 * 3600e3), p = (n) => String(n).padStart(2, '0');
        return f.replace('yyyy', x.getUTCFullYear()).replace('yy', String(x.getUTCFullYear()).slice(2)).replace('MM', p(x.getUTCMonth() + 1)).replace('dd', p(x.getUTCDate())).replace('HH', p(x.getUTCHours())).replace('mm', p(x.getUTCMinutes())); },
      base64Decode: (s) => Buffer.from(s, 'base64'), base64Encode: (b) => Buffer.from(b).toString('base64'), newBlob: (bytes, type, name) => ({ bytes, type, name }), sleep() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; }, getProperties: () => Object.assign({}, props), deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, MailApp: { sendEmail: (to, subject) => mails.push(to + ' | ' + subject) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) }, Logger: { log() {} } };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  const get = (q) => JSON.parse(ctx.doGet({ parameter: q || {} }).s);
  let tick = 0;
  return { props, mails, post, get, files, plan: () => get({ action: 'music' }),
    share(id, list, opt) { const ids = list.map((x, k) => { const fid2 = id + '-' + k + 'xxxxxxxx'; files[fid2] = Object.assign({}, x); return fid2; }); if (!(opt && opt.file)) shared[id] = ids; return ids; },
    // mỗi lần đặt giờ và mỗi bài thêm lệch nhau 1 giây, để thứ tự "duyệt trước phát trước" giống thật
    time: (iso) => { offset = new RealDate(iso) - RealDate.now(); tick = 0; },
    add(title, artist, dept, sender, opt) {
      offset += 1000; tick++;
      const r = post({ action: 'music_submit', record: { dept, sender, title, artist, duration: (opt && opt.duration) || 240 }, file: { name: 'a.mp3', type: 'audio/mpeg', data: 'AAAA' } });
      if (!r.ok) return r;
      return post({ action: 'music_save', key: 'test', record: Object.assign({ id: r.record.id, status: 'approved', title, artist, dept, sender }, opt || {}) });
    } };
};
if (require.main === module) {
  const g = module.exports();
  g.time('2026-11-18T03:00:00Z');
  g.add('Bài A', 'Ca sĩ 1', 'Phòng 1', 'An'); g.add('Bài B', '', 'Phòng 2', 'Bình'); g.add('Bài A', '', 'Phòng 3', 'Chi');
  const p = g.plan();
  console.log(p.day, p.locked ? 'chốt' : 'dự kiến', '|', p.items.map((i) => i.title + ' (' + i.sender + ') @' + i.at).join(', '), '| chờ buổi sau', p.waiting);
  console.log('lý do chờ:', JSON.stringify(g.post({ action: 'music_list', key: 'test' }).why));
}
