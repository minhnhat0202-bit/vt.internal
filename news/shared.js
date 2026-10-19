// Mã dùng chung: Bản tin TV (tv/index.html), trang gửi tin (news/index.html), trang duyệt (news/duyet.html).
// Viết kiểu ES2015 cho trình duyệt TV cũ: không dùng ?. ?? async/await.
//
// Một tin (record) gồm:
//   id, status ('pending' | 'approved' | 'rejected' | 'archived'), createdAt, updatedAt
//   dept, sender, contact, message (lời nhắn cho Ban Truyền thông)
//   where: { story, agenda, ticker }       vị trí trên TV đơn vị chọn
//   title, tab, tag, sub, images: [{ url, id?, w, h }], videoLink
//   event: { title, from, to, time, place }
//   ticker, showFrom, showUntil ('YYYY-MM-DD')
//   pin, slideSeconds, note (admin)
(function (W) {
  'use strict';
  var CFG = W.VTNEWS_CONFIG || {};
  var KEY = { demo: 'vtnews-demo', cache: 'vtnews-cache', preview: 'vtnews-preview' };
  var PRIVATE = ['sender', 'contact', 'message', 'note', 'videoLink'];

  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) { return v === undefined ? null : false; }
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function addDays(iso, n) { var a = iso.split('-').map(Number); return dayKey(new Date(a[0], a[1] - 1, a[2] + n)); }
  function deptShort(name) {
    var d = (CFG.DEPARTMENTS || []).filter(function (o) { return o.name === name; })[0];
    return d ? d.short : String(name || '').replace(/^Phòng\s+/, 'P. ');
  }
  function onAir(r, t) {
    t = t || dayKey();
    return r.status === 'approved' && (!r.showFrom || r.showFrom <= t) && (!r.showUntil || r.showUntil >= t);
  }
  // Trạng thái hiển thị cho trang duyệt
  function stateOf(r) {
    if (r.status === 'approved') {
      var t = dayKey();
      if (r.showUntil && r.showUntil < t) return { key: 'expired', label: 'Hết hạn chiếu' };
      if (r.showFrom && r.showFrom > t) return { key: 'scheduled', label: 'Đã duyệt · chờ ngày chiếu' };
      return { key: 'live', label: 'Đang lên TV' };
    }
    return { pending: { key: 'pending', label: 'Chờ duyệt' }, rejected: { key: 'rejected', label: 'Từ chối' }, archived: { key: 'archived', label: 'Đã gỡ' } }[r.status] || { key: 'pending', label: 'Chờ duyệt' };
  }

  // Một tin → các mục theo đúng định dạng tv/content.js (STORIES, AGENDA, TICKER)
  function toTV(r, preview) {
    var w = r.where || {}, out = { stories: [], agenda: [], ticker: [] };
    var imgs = (r.images || []).map(function (i) { return i.url; }).filter(Boolean);
    if (w.story && r.title && (imgs.length || preview)) {
      var st = { id: 'n-' + r.id, news: r.id, tab: r.tab || r.title, title: r.title, tag: r.tag || '',
        sub: [r.sub, deptShort(r.dept)].filter(Boolean).join(' · '), until: r.showUntil || '', pin: !!r.pin };
      if (imgs.length > 1) { st.slides = imgs.map(function (u) { return { src: u }; }); st.slideSeconds = +r.slideSeconds || CFG.SLIDE_SECONDS || 8; }
      else st.image = imgs[0] || '';
      out.stories.push(st);
    }
    var ev = r.event || {};
    if (w.agenda && ev.from) {
      var a = { title: ev.title || r.title || '', from: ev.from };
      if (ev.to && ev.to > ev.from) a.to = ev.to;
      if (ev.time) a.time = ev.time;
      a.place = ev.place || deptShort(r.dept);
      out.agenda.push(a);
    }
    if (w.ticker && r.ticker) out.ticker.push({ text: r.ticker, until: r.showUntil || '' });
    return out;
  }
  // Ghép tin đã duyệt vào window.TV: tin ghim lên đầu, tin thường nối sau tin trong content.js
  function mergeInto(TV, recs) {
    var pinned = [], rest = [];
    TV.STORIES = TV.STORIES || []; TV.AGENDA = TV.AGENDA || []; TV.TICKER = TV.TICKER || [];
    recs.forEach(function (r) {
      var x = toTV(r);
      x.stories.forEach(function (s) { (s.pin ? pinned : rest).push(s); });
      TV.AGENDA = TV.AGENDA.concat(x.agenda);
      TV.TICKER = TV.TICKER.concat(x.ticker);
    });
    TV.STORIES = pinned.concat(TV.STORIES, rest);
  }
  function publicOf(r) { var o = {}; Object.keys(r).forEach(function (k) { if (PRIVATE.indexOf(k) < 0) o[k] = r[k]; }); return o; }
  function sig(items) { return items.map(function (r) { return r.id + '@' + r.updatedAt; }).sort().join('|'); }

  // ---------- máy chủ: Apps Script, hoặc chế độ thử trong trình duyệt ----------
  function call(action, data) {
    data = data || {};
    if (!CFG.API_URL) return demo(action, data);
    var url = CFG.API_URL, req;
    if (action === 'published') req = fetch(url + (url.indexOf('?') > -1 ? '&' : '?') + 'action=published&t=' + Date.now(), { cache: 'no-store', redirect: 'follow' });
    else req = fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, data)) });
    return req.then(function (r) { if (!r.ok) throw new Error('Máy chủ trả lỗi ' + r.status); return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Lỗi không rõ'); return j; });
  }
  // images: record.images giữ thứ tự; ảnh mới là { new: k } trỏ tới files[k] = { name, type, data (base64), w, h }
  function placeImages(list, files, upload) {
    return (list || []).map(function (i) { return i && i['new'] !== undefined ? upload(files[i['new']]) : i; }).filter(Boolean);
  }
  function newId() {
    var d = new Date(), s = String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate());
    return 'T' + s + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  function demo(action, p) {
    return new Promise(function (res, rej) {
      var list = store(KEY.demo) || [], now = new Date().toISOString();
      var asData = function (f) { return f ? { url: 'data:' + (f.type || 'image/jpeg') + ';base64,' + f.data, w: f.w, h: f.h } : null; };
      var idx = function (id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; };
      var save = function () { if (!store(KEY.demo, list)) throw new Error('Bộ nhớ trình duyệt đã đầy (chế độ thử lưu cả ảnh trong trình duyệt). Vào trang duyệt, xoá bớt tin thử.'); };
      setTimeout(function () {
        try {
          if (action === 'login') return res({ ok: true, demo: true });
          if (action === 'published') return res({ ok: true, items: list.filter(function (r) { return r.status === 'approved'; }).map(publicOf) });
          if (action === 'list') return res({ ok: true, items: list });
          if (action === 'submit') {
            var r = Object.assign({}, p.record, { id: newId(), status: 'pending', createdAt: now, updatedAt: now, pin: false, note: '' });
            r.images = placeImages(p.record.images, p.files || [], asData);
            list.unshift(r); save(); return res({ ok: true, record: r });
          }
          var i = idx((p.record && p.record.id) || p.id);
          if (i < 0) throw new Error('Không tìm thấy tin');
          if (action === 'save') {
            var r2 = Object.assign({}, list[i], p.record, { updatedAt: now });
            r2.images = placeImages(p.record.images || list[i].images, p.files || [], asData);
            list[i] = r2; save(); return res({ ok: true, record: r2 });
          }
          if (action === 'delete') { list.splice(i, 1); save(); return res({ ok: true }); }
          throw new Error('Thao tác không hỗ trợ: ' + action);
        } catch (e) { rej(e); }
      }, 250);
    });
  }
  function published() {
    return call('published').then(function (j) { if (CFG.API_URL) store(KEY.cache, j.items); return j.items || []; });
  }
  function withTimeout(p, ms) {
    return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error('timeout')); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); });
  }

  // ---------- Bản tin TV ----------
  // Ghép tin đã duyệt vào window.TV trước khi TV chạy. Có bản lưu đệm thì chạy ngay bằng bản đó,
  // VTNews.watch() kiểm tra lại máy chủ định kỳ và tải lại trang khi danh sách tin đổi.
  // preview = true: thêm tin đang soạn (localStorage vtnews-preview) vào đầu, dùng cho khung xem trước.
  var api = { bootSig: null };
  function loadForTV(TV, preview) {
    var draft = preview ? store(KEY.preview) : null;
    function apply(items) {
      items = (items || []).filter(function (r) { return onAir(r) && !(draft && r.id === draft.id); });
      api.bootSig = sig(items);
      mergeInto(TV, items);
      if (draft) {
        var x = toTV(draft, true);
        TV.STORIES = x.stories.concat(TV.STORIES);
        TV.AGENDA = TV.AGENDA.concat(x.agenda);
        TV.TICKER = x.ticker.concat(TV.TICKER);
      }
    }
    var cached = CFG.API_URL ? store(KEY.cache) : null;
    if (cached) { apply(cached); return Promise.resolve(); }
    return withTimeout(published(), 6000).then(apply, function () { apply([]); });
  }
  function watch(seconds) {
    setInterval(function () {
      published().then(function (items) {
        var s = sig(items.filter(function (r) { return onAir(r); }));
        if (api.bootSig !== null && s !== api.bootSig) location.reload();
      }, function () {});
    }, Math.max(30, seconds || 120) * 1000);
  }

  W.VTNews = Object.assign(api, {
    KEY: KEY, store: store, dayKey: dayKey, addDays: addDays, deptShort: deptShort, onAir: onAir, stateOf: stateOf,
    toTV: toTV, mergeInto: mergeInto, call: call, published: published, loadForTV: loadForTV, watch: watch,
    isDemo: function () { return !CFG.API_URL; },
    setPreview: function (r) { return store(KEY.preview, r); }
  });
})(window);
