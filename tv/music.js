// Nhạc giải lao trên Bản tin TV: phát danh sách GET ?action=music (phần NHẠC GIẢI LAO trong apps-script/news.gs)
// trong khung start–end. Bài nào, giây thứ mấy đều tính theo giờ thực, nên nhiều TV phát khớp nhau và trang tự tải lại
// giữa chừng vẫn phát tiếp đúng chỗ. Trong giờ nhạc, pop-up "Giờ giải lao" nổi giữa màn hình trên nền tối, hết giờ tự đóng.
// Trình duyệt chặn tự phát tiếng: máy chạy TV cần Chrome mở kèm --autoplay-policy=no-user-gesture-required
// (hoặc Site settings → Sound → Allow); không thì khung nhạc hiện lời nhắc bấm OK trên điều khiển.
// Thử: tv/?nhac (giả giờ: 3 giây trước giờ phát), tv/?nhac=16:20 (giả giờ đó của ngày phát).
// Viết kiểu ES5 cho trình duyệt TV cũ.
(function () {
  'use strict';
  var CFG = window.VTNEWS_CONFIG || {}, N = window.VTNews;
  if (!N || !CFG.API_URL || /[?&]preview\b/.test(location.search)) return;
  var TEST = location.search.match(/[?&]nhac(?:=(\d{1,2}):(\d{2}))?/);
  var skew = null;                       // ms cộng vào giờ máy, chỉ dùng khi thử
  var plan = null, fetchedAt = 0, cur = -1, players = {}, blocked = false, shown = false;

  function now() { return Date.now() + (skew || 0); }
  function hm(s) { var a = String(s).split(':'); return +a[0] * 60 + +a[1]; }
  function at(p, min) { var a = p.day.split('-'); return new Date(+a[0], a[1] - 1, +a[2], Math.floor(min / 60), min % 60).getTime(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  // ---------- giao diện: pop-up "Giờ giải lao" giữa màn hình, nền tối phủ lên bản tin (chừa dòng chạy có mã QR gửi bài) ----------
  // Hiện từ 2 phút trước giờ phát, tự đóng lúc hết giờ (MUSIC.end trong news.gs).
  var css = document.createElement('style');
  css.textContent =
    '.mscrim { position: absolute; left: 0; top: 0; right: 0; bottom: 116px; z-index: 20; background: rgba(0,0,0,.85); opacity: 0; visibility: hidden; transition: opacity .8s ease, visibility 0s .8s; }' +
    '.mscrim.on { opacity: 1; visibility: visible; transition: opacity .8s ease; }' +
    '.mpop { position: absolute; left: 50%; top: 482px; width: 1240px; height: 620px; margin: -310px 0 0 -620px; z-index: 21; display: flex; flex-direction: row; align-items: center; padding: 56px 64px 48px; background: rgba(14,14,16,.97); border-color: rgba(238,0,51,.6); box-shadow: 0 40px 120px rgba(0,0,0,.8), 0 0 90px rgba(238,0,51,.25); opacity: 0; visibility: hidden; transform: scale(.94); transition: opacity .6s ease, transform .6s ease, visibility 0s .6s; }' +
    '.mpop.on { opacity: 1; visibility: visible; transform: none; transition: opacity .6s ease .2s, transform .6s ease .2s; }' +
    '.mpop .lbl { left: 44px; top: -26px; font-size: 30px; padding: 10px 26px; }' +
    '.mpop .pg { right: 40px; top: 18px; font-size: 26px; }' +
    '.mpop .ml { flex: none; width: 380px; display: flex; justify-content: center; margin-right: 60px; }' +
    '.mpop .mr { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; height: 100%; }' +
    '.mpop .disc { position: relative; width: 360px; height: 360px; border-radius: 50%; background: repeating-radial-gradient(circle, #000 0 2px, #1d1f21 2px 4px); box-shadow: 0 0 0 7px rgba(255,255,255,.07), 0 24px 60px rgba(0,0,0,.75), 0 0 100px rgba(238,0,51,.3); }' +
    '.mpop .disc i { position: absolute; left: 33%; top: 33%; right: 33%; bottom: 33%; border-radius: 50%; background: var(--red); color: #fff; font-style: normal; font-size: 46px; line-height: 1; }' +
    '.mpop .disc i::after { content: ""; position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: #000; }' +
    '.mpop .disc i b { position: absolute; left: 16%; top: 12%; font-weight: 400; }' +
    '.mpop .disc::after { content: ""; position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,.14), transparent 40%, transparent 60%, rgba(255,255,255,.06)); }' +
    '.mpop.play .disc { animation: mp-spin 4s linear infinite; }' +
    '.mpop .kick { display: flex; align-items: center; font-family: var(--display); font-weight: 700; font-size: 26px; letter-spacing: .14em; text-transform: uppercase; color: var(--red); }' +
    '.mpop .eq { display: none; align-items: flex-end; height: 26px; margin-right: 14px; }' +
    '.mpop.play .eq { display: flex; }' +
    '.mpop .eq i { width: 6px; height: 40%; margin-right: 5px; border-radius: 3px; background: var(--red); animation: mp-eq 1s ease-in-out infinite alternate; }' +
    '.mpop .eq i:nth-child(2) { animation-delay: -.35s; } .mpop .eq i:nth-child(3) { animation-delay: -.7s; } .mpop .eq i:nth-child(4) { animation-delay: -.15s; }' +
    '.mpop .ttl { margin: 12px 0 0; font-family: var(--display); font-weight: 800; font-size: 58px; line-height: 1.12; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 0 30px rgba(238,0,51,.35); }' +
    '.mpop .art { margin-top: 8px; font-size: 34px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
    '.mpop .bar { height: 10px; margin-top: 26px; border-radius: 5px; background: rgba(255,255,255,.14); overflow: hidden; }' +
    '.mpop .bar b { display: block; height: 100%; width: 0; background: var(--red); border-radius: 5px; transition: width 1s linear; }' +
    '.mpop .tm { display: flex; justify-content: space-between; margin-top: 10px; font-size: 26px; color: var(--ink-3); font-variant-numeric: tabular-nums; }' +
    '.mpop .gift { margin-top: 24px; padding-top: 20px; border-top: 1.5px solid rgba(255,255,255,.14); font-size: 30px; color: var(--ink-2); }' +
    '.mpop .gift small { display: block; font-size: 22px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px; }' +
    '.mpop .gift b { color: var(--ink); font-size: 36px; }' +
    '.mpop .gift p { margin: 10px 0 0; font-size: 38px; line-height: 1.25; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }' +
    '.mpop .gift p::before { content: "“"; color: var(--red); font-family: var(--display); font-weight: 800; margin-right: 6px; }' +
    '.mpop .gift p::after { content: "”"; color: var(--red); font-family: var(--display); font-weight: 800; margin-left: 4px; }' +
    '.mpop .foot { margin-top: 22px; font-size: 26px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
    '.mpop .foot b { color: var(--ink-2); font-weight: 500; }' +
    '.mpop .ok { width: 220px; height: 220px; border-radius: 50%; border: 8px solid var(--ink); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 800; font-size: 80px; animation: mp-pulse 1.6s ease-in-out infinite; }' +
    '@keyframes mp-spin { to { transform: rotate(360deg); } }' +
    '@keyframes mp-eq { from { height: 20%; } to { height: 100%; } }' +
    '@keyframes mp-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(238,0,51,.6); } 50% { box-shadow: 0 0 0 36px rgba(238,0,51,0); } }' +
    '@media (prefers-reduced-motion: reduce) { .mpop.play .disc, .mpop .eq i, .mpop .ok { animation: none; } }';
  document.head.appendChild(css);
  var stage = document.getElementById('stage') || document.body;
  var scrim = document.createElement('div'); scrim.className = 'mscrim'; stage.appendChild(scrim);
  var pop = document.createElement('section'); pop.className = 'mpop glass panel'; stage.appendChild(pop);
  var popSig = '';
  function hhmm(p, sec) { var m = hm(p.start) * 60 + Math.round(sec); return ('0' + Math.floor(m / 3600)).slice(-2) + ':' + ('0' + Math.floor(m / 60) % 60).slice(-2); }
  function gift(it) {
    if (it.fallback) return '<div class="gift"><small>Nhạc nền giờ giải lao</small>Ban Truyền thông chọn</div>';
    return '<div class="gift"><small>Gửi tặng cả Trung tâm</small><b>' + esc(it.sender) + '</b> · ' + esc(N.deptShort(it.dept)) + (it.message ? '<p>' + esc(it.message) + '</p>' : '') + '</div>';
  }
  function after(p, it) {                 // dòng cuối: bài kế tiếp
    var k = p.items.indexOf(it), nx = k > -1 ? p.items[k + 1] : null;
    return nx ? '<div class="foot">Tiếp theo ' + hhmm(p, nx.at) + ' · <b>' + esc(nx.title) + '</b></div>' : '<div class="foot">Gửi bài cho buổi sau: quét mã góc phải dưới</div>';
  }
  var DISC = '<div class="ml"><div class="disc"><i><b>♪</b></i></div></div>';
  // v: { kind: 'play' | 'next' | 'end' | 'tap', it, el (giây đã phát), left (giây còn lại tới bài kế / hết giờ) }
  function show(v) {
    var p = plan, it = v.it, sig = v.kind + '|' + (it ? it.id : '') + '|' + p.items.length;
    if (sig !== popSig) {
      popSig = sig;
      var h = '<span class="lbl">Giờ giải lao</span><span class="pg">' + esc(p.start) + ' – ' + esc(p.end) + '</span>';
      if (v.kind === 'tap') h += '<div class="ml"><div class="ok">OK</div></div><div class="mr"><div class="kick">Chưa có tiếng</div><h3 class="ttl">Bấm OK trên điều khiển để bật nhạc</h3>' +
        '<div class="art">' + (v.pre ? 'Nhạc bắt đầu lúc ' + esc(p.start) : 'TV đang chặn tự phát âm thanh') + '</div>' + (it ? '<div class="foot">' + (v.pre ? 'Bài đầu tiên' : 'Đang tới lượt') + ': <b>' + esc(it.title) + '</b></div>' : '') + '</div>';
      else if (v.kind === 'end') h += DISC + '<div class="mr"><div class="kick">Hết bài hôm nay</div><h3 class="ttl">Muốn nghe bài của mình?</h3>' +
        '<div class="art">Quét mã góc phải dưới để gửi bài</div><div class="tm"><span>Giờ giải lao còn</span><span data-x="left"></span></div><div class="foot">Bài được duyệt sẽ phát buổi tới</div></div>';
      else h += DISC + '<div class="mr"><div class="kick"><span class="eq"><i></i><i></i><i></i><i></i></span>' + (v.kind === 'play' ? 'Đang phát' : v.kind === 'load' ? 'Đang tải bài…' : v.kind === 'bad' ? 'Không tải được bài này' : 'Sắp phát · ' + hhmm(p, it.at)) + '</div>' +
        '<h3 class="ttl">' + esc(it.title) + '</h3>' + (it.artist ? '<div class="art">' + esc(it.artist) + '</div>' : '') +
        (v.kind !== 'next' ? '<div class="bar"><b data-x="bar"></b></div><div class="tm"><span data-x="el"></span><span>' + mmss(it.duration) + '</span></div>'
          : '<div class="tm"><span>Bắt đầu sau</span><span data-x="left"></span></div>') + gift(it) + after(p, it) + '</div>';
      pop.innerHTML = h;
    }
    pop.className = 'mpop glass panel on ' + v.kind; scrim.className = 'mscrim on';
    var x = pop.querySelectorAll('[data-x]'), k;
    for (k = 0; k < x.length; k++) {
      var f = x[k].getAttribute('data-x');
      if (f === 'el') x[k].textContent = mmss(v.el);
      else if (f === 'left') x[k].textContent = mmss(v.left);
      else if (f === 'bar') x[k].style.width = Math.min(100, v.el / it.duration * 100) + '%';
    }
    shown = true;
  }
  function hide() { if (!shown) return; pop.className = 'mpop glass panel'; scrim.className = 'mscrim'; popSig = ''; shown = false; }

  // ---------- phát ----------
  // File nhạc lấy qua Apps Script (Drive chặn phát thẳng từ trang ngoài) rất chậm: 15–45 giây mỗi bài. Nên:
  // - ngày có giờ nhạc, từ PRELOAD_FROM giờ sáng tải lần lượt mọi bài trong danh sách (bài sắp tới lượt trước);
  // - lưu file vào Cache Storage của trình duyệt: trang tải lại giữa chừng lấy ngay, không tải lại; bài rời danh sách thì xoá;
  // - tải xong thử mở file (đọc được, có thời lượng) rồi mới coi là sẵn sàng; lỗi thì 10 giây sau thử lại.
  // Bài chưa sẵn sàng tới lượt thì pop-up ghi "Đang tải bài…", không hiện "Đang phát" khi chưa có tiếng.
  var PRELOAD_FROM = 10, CACHE = 'vt-nhac', BASE = location.origin + '/vt-nhac/';
  var blobs = {}, failAt = {}, fails = {}, loading = 0;
  var store = !!(window.caches && window.Response && location.protocol === 'https:' || window.caches && /^localhost$|^127\./.test(location.hostname));
  function cacheGet(id) {
    if (!store) return Promise.resolve(null);
    return caches.open(CACHE).then(function (c) { return c.match(BASE + id); }).then(function (r) { return r ? r.blob() : null; })['catch'](function () { return null; });
  }
  function cachePut(id, b) { if (store) caches.open(CACHE).then(function (c) { return c.put(BASE + id, new Response(b)); })['catch'](function () {}); }
  function cacheClean(keep) {
    if (!store) return;
    caches.open(CACHE).then(function (c) {
      return c.keys().then(function (ks) { ks.forEach(function (k) { if (!keep[k.url.split('/vt-nhac/')[1]]) c['delete'](k); }); });
    })['catch'](function () {});
  }
  function verify(b) {                   // mở thử file: có thời lượng mới nhận; trình duyệt chậm không báo trong 20 giây thì cứ nhận
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(b), t = new Audio(), done = false;
      function end(good) {
        if (done) return; done = true;
        try { t.removeAttribute('src'); t.load(); } catch (e) {}
        if (good) ok(u); else { URL.revokeObjectURL(u); bad(new Error('file hỏng')); }
      }
      t.preload = 'metadata';
      t.onloadedmetadata = function () { end(t.duration > 0); };
      t.onerror = function () { end(false); };
      setTimeout(function () { end(true); }, 20000);
      t.src = u;
    });
  }
  function fetchOne(id) {
    loading = Date.now();
    var fresh = false;
    cacheGet(id).then(function (b) { if (b && b.size) return b; fresh = true; return N.audioBlob(id); })
      .then(function (b) { return verify(b).then(function (u) { if (fresh) cachePut(id, b); return u; }); })
      .then(function (u) { blobs[id] = u; fails[id] = 0; loading = 0; },
        function () { fails[id] = (fails[id] || 0) + 1; failAt[id] = Date.now(); loading = 0; });
  }
  function preload(from) {
    if (loading && Date.now() - loading < 180000) return;              // mỗi lần một bài; treo quá 3 phút thì bỏ
    for (var k = from; k < plan.items.length; k++) {                  // chỉ bài từ lượt hiện tại trở đi (bài đã phát không tải lại)
      var id = plan.items[k].id;
      if (blobs[id] || failAt[id] > Date.now() - 10000) continue;
      fetchOne(id); return;
    }
  }
  function player(i) {
    var it = plan.items[i]; if (!it) return null;
    var a = players[it.id];
    if (!a) { a = new Audio(); a.preload = 'auto'; players[it.id] = a; }
    if (!a.src && blobs[it.id]) a.src = blobs[it.id];
    return a;
  }
  function stopAll(keep) {
    for (var k in players) drop(k, keep);
    players = {}; cur = -1;
    if (!keep) { for (k in blobs) try { URL.revokeObjectURL(blobs[k]); } catch (e) {} blobs = {}; }
  }
  function drop(id, keep) {
    var a = players[id];
    if (a) try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {}
    delete players[id];
    if (!keep && blobs[id]) { try { URL.revokeObjectURL(blobs[id]); } catch (e) {} delete blobs[id]; }
  }
  function tryPlay(a) {
    if (!a.src) return;                                            // file chưa tải xong
    var pr = a.play();
    if (pr && pr.then) pr.then(function () { blocked = false; }, function (e) { if (e && e.name === 'NotAllowedError') blocked = true; });
  }
  // Trình duyệt TV (Samsung, Android TV) không có chỗ cho phép tự phát tiếng: chỉ cần một lần bấm OK trên điều khiển
  // sau khi trang mở là cả trang được phát tiếng. 15 phút trước giờ phát, thử phát một đoạn im lặng; bị chặn thì nhắc bấm OK.
  var probed = false, needTap = false;
  function silent() {                    // WAV im lặng 0,05 giây, tạo tại chỗ
    var n = 400, h = 'RIFF' + u32(36 + n) + 'WAVEfmt ' + u32(16) + u16(1) + u16(1) + u32(8000) + u32(8000) + u16(1) + u16(8) + 'data' + u32(n), k;
    for (k = 0; k < n; k++) h += String.fromCharCode(128);
    return 'data:audio/wav;base64,' + btoa(h);
    function u16(x) { return String.fromCharCode(x & 255, (x >> 8) & 255); }
    function u32(x) { return u16(x & 65535) + u16((x >>> 16) & 65535); }
  }
  function probe() {
    if (probed) return; probed = true;
    try {
      var pr = new Audio(silent()).play();
      if (pr && pr.then) pr.then(function () { needTap = false; }, function (e) { if (e && e.name === 'NotAllowedError') needTap = true; });
    } catch (e) {}
  }
  function unlock() {
    if (needTap) { needTap = false; try { new Audio(silent()).play(); } catch (e) {} }
    if (!blocked || cur < 0) return; var a = player(cur); if (a) tryPlay(a);
  }
  document.addEventListener('click', unlock); document.addEventListener('keydown', unlock);
  // Giữ trang không tự tải lại (tin mới, sửa nội dung) từ 15 phút trước giờ phát tới hết giờ: tải lại là mất lần bấm OK.
  // tv/index.html và news/shared.js hỏi hàm này trước khi tải lại; đổi nội dung sẽ được tải sau giờ nhạc.
  window.nhacGiu = function () {
    if (!plan || !plan.items || !plan.items.length) return false;
    var t = now(); return t > at(plan, hm(plan.start)) - 900000 && t < at(plan, hm(plan.end));
  };

  function nextIdx(p, t, s) {             // bài đang phát hoặc sắp tới lượt: tải trước nhất
    var el = (t - s) / 1000, k;
    for (k = 0; k < p.items.length; k++) if (el < p.items[k].at + p.items[k].duration) return k;
    return 0;
  }
  function tick() {
    var p = plan, t = now();
    if (!p || !p.items) return hide();
    var s = at(p, hm(p.start)), e = at(p, hm(p.end));
    if (p.items.length && t < e && new Date(t).getHours() >= PRELOAD_FROM && t > s - 86400000) preload(nextIdx(p, t, s));
    if (t < s - 900000 || t >= e || !p.items.length) { if (cur > -1 || shown) { stopAll(); hide(); } return; }
    if (t < s) {
      probe();
      if (needTap) show({ kind: 'tap', pre: true, it: p.items[0] });
      else if (t >= s - 120000) show({ kind: 'next', it: p.items[0], left: (s + p.items[0].at * 1000 - t) / 1000 });   // 2 phút trước: khung nổi lên
      else hide();
      return;
    }
    var el = (t - s) / 1000, i = -1, k;
    for (k = 0; k < p.items.length; k++) if (el >= p.items[k].at && el < p.items[k].at + p.items[k].duration) { i = k; break; }
    var left = (e - t) / 1000;
    if (i < 0) {                                                 // giữa hai bài, hoặc hết danh sách
      var nx = null; for (k = 0; k < p.items.length; k++) if (p.items[k].at > el) { nx = p.items[k]; break; }
      if (cur > -1) { var old = player(cur); if (old && !old.ended && el > p.items[cur].at + p.items[cur].duration + 3) old.pause(); }
      if (nx) show({ kind: 'next', it: nx, left: nx.at - el });
      else show({ kind: 'end', left: left });
      return;
    }
    var it = p.items[i], a = player(i), want = el - it.at;
    if (i !== cur) {
      if (cur > -1 && p.items[cur]) drop(p.items[cur].id);       // bài trước xong: trả bộ nhớ
      cur = i; a.volume = 1;
      if (want > 3) { try { a.currentTime = want; } catch (x) {} }
      tryPlay(a);
    } else if (a.readyState > 0 && Math.abs(a.currentTime - want) > 6) {
      try { a.currentTime = want; } catch (x) {}                   // lệch giờ quá 6 giây (mạng chậm, TV khác) thì kéo về
    } else if (a.paused && !blocked && !a.ended) tryPlay(a);
    if (left < 6) a.volume = Math.max(0, left / 6);                  // nhỏ dần 6 giây cuối khung giờ
    // chưa có file (đang tải) thì nói thật, không hiện "Đang phát" khi chưa có tiếng
    show(blocked ? { kind: 'tap', it: it } : { kind: a.src && a.readyState > 1 ? 'play' : fails[it.id] >= 3 ? 'bad' : 'load', it: it, el: want });
  }

  // ---------- lấy danh sách: quanh giờ phát mỗi phút, ngoài giờ 10 phút một lần ----------
  function load() {
    fetchedAt = Date.now();
    return N.call('music').then(function (p) {
      if (TEST && skew === null) {
        skew = (TEST[1] ? at(p, +TEST[1] * 60 + +TEST[2]) : at(p, hm(p.start)) - 3000) - Date.now();
        console.log('[nhạc] thử: giờ giả ' + new Date(now()).toLocaleString('vi-VN'));
      }
      // chỉ dừng nhạc khi các bài đã xếp đổi chỗ; bài duyệt muộn được nối thêm vào cuối thì phát tiếp bình thường
      var same = plan && plan.day === p.day && plan.items.length <= p.items.length && plan.items.every(function (x, k) { return p.items[k].id === x.id && p.items[k].at === x.at; });
      if (plan && !same) stopAll(true);                           // giữ file đã tải (theo mã bài)
      plan = p;
      var keep = {}; p.items.forEach(function (x) { keep[x.id] = 1; }); cacheClean(keep);   // bài rời danh sách: xoá khỏi bộ nhớ trình duyệt
    }, function () {});
  }
  function near() {
    if (!plan) return true;
    var t = now(); return t > at(plan, hm(plan.start)) - 600000 && t < at(plan, hm(plan.end));
  }
  if (TEST) window.nhacDebug = function () { var a = cur > -1 && players[plan.items[cur].id]; return { now: new Date(now()).toTimeString().slice(0, 8), cur: cur, title: cur > -1 ? plan.items[cur].title : '', time: a ? Math.round(a.currentTime) : null, paused: a ? a.paused : null, blocked: blocked, strip: pop.textContent }; };
  load();
  setInterval(function () {
    if (Date.now() - fetchedAt > (near() ? 60000 : 600000)) load();
    try { tick(); } catch (e) {}
  }, 1000);
})();
