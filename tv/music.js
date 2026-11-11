// Nhạc giải lao trên Bản tin TV: phát danh sách GET ?action=music (phần NHẠC GIẢI LAO trong apps-script/news.gs)
// trong khung start–end. Bài nào, giây thứ mấy đều tính theo giờ thực, nên nhiều TV phát khớp nhau và trang tự tải lại
// giữa chừng vẫn phát tiếp đúng chỗ. Trong lúc phát, dải "Đang phát" che dòng chạy Đừng bỏ lỡ.
// Trình duyệt chặn tự phát tiếng: máy chạy TV cần Chrome mở kèm --autoplay-policy=no-user-gesture-required
// (hoặc Site settings → Sound → Allow); không thì dải nhạc hiện lời nhắc bấm vào màn hình.
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

  // ---------- giao diện: dải Đang phát đè lên dòng chạy ----------
  var css = document.createElement('style');
  css.textContent =
    '.ticker .np { position: absolute; left: 0; top: 0; right: 0; bottom: 0; z-index: 1; display: none; align-items: center; padding: 0 50px 0 70px; background: rgba(10,9,12,.96); white-space: nowrap; font-size: 36px; }' +
    '.ticker .np.on { display: flex; }' +
    '.ticker .np .eq { flex: none; display: flex; align-items: flex-end; height: 40px; margin-right: 26px; }' +
    '.ticker .np .eq i { width: 7px; height: 40%; margin-right: 5px; border-radius: 3px; background: var(--red); animation: np-eq 1s ease-in-out infinite alternate; }' +
    '.ticker .np .eq i:nth-child(2) { animation-delay: -.35s; } .ticker .np .eq i:nth-child(3) { animation-delay: -.7s; } .ticker .np .eq i:nth-child(4) { animation-delay: -.15s; }' +
    '.ticker .np.wait .eq i { animation: none; height: 25%; }' +
    '.ticker .np b { flex: none; font-family: var(--display); font-weight: 700; max-width: 46%; overflow: hidden; text-overflow: ellipsis; }' +
    '.ticker .np .by { flex: 1; min-width: 0; margin-left: 28px; overflow: hidden; text-overflow: ellipsis; color: #B5B4B4; font-size: 30px; }' +
    '.ticker .np .by em { font-style: normal; color: #fff; }' +
    '.ticker .np .tm { flex: none; margin-left: 28px; font-size: 26px; color: #B5B4B4; font-variant-numeric: tabular-nums; }' +
    '@keyframes np-eq { from { height: 20%; } to { height: 100%; } }' +
    '@media (prefers-reduced-motion: reduce) { .ticker .np .eq i { animation: none; height: 70%; } }';
  document.head.appendChild(css);
  var run = document.querySelector('.ticker .run'), tag = document.querySelector('.ticker .tag');
  if (!run) return;
  // dùng section, không dùng div: .ticker .run div có sẵn hiệu ứng chạy chữ và khoảng cách 120 px
  var np = document.createElement('section'); np.className = 'np'; run.appendChild(np);
  var tagText = tag ? tag.textContent : '';
  function show(html, waiting) {
    np.innerHTML = '<span class="eq"><i></i><i></i><i></i><i></i></span>' + html;
    np.className = 'np on' + (waiting ? ' wait' : '');
    if (tag && !shown) tag.textContent = 'Giờ giải lao';
    shown = true;
  }
  function hide() { if (!shown) return; np.className = 'np'; if (tag) tag.textContent = tagText; shown = false; }
  function line(it) {
    var who = it.fallback ? 'Nhạc nền giờ giải lao' : esc(it.sender) + ' · ' + esc(N.deptShort(it.dept)) + (it.message ? ': <em>“' + esc(it.message) + '”</em>' : '');
    return '<b>' + esc(it.title) + (it.artist ? ' · ' + esc(it.artist) : '') + '</b><span class="by">' + who + '</span>';
  }

  // ---------- phát ----------
  function player(i) {
    var it = plan.items[i]; if (!it) return null;
    if (!players[it.id]) {                // Drive chặn phát thẳng từ trang ngoài: lấy file qua Apps Script rồi phát blob
      var a = new Audio(); a.preload = 'auto'; players[it.id] = a;
      N.audio(it.id).then(function (u) { if (players[it.id] === a) a.src = u; else URL.revokeObjectURL(u); },
        function () { if (players[it.id] === a) delete players[it.id]; });   // lỗi mạng: lần tick sau thử lại
    }
    return players[it.id];
  }
  function stopAll() {
    for (var k in players) drop(players[k]);
    players = {}; cur = -1;
  }
  function drop(a) {
    try { a.pause(); if (/^blob:/.test(a.src)) URL.revokeObjectURL(a.src); a.removeAttribute('src'); a.load(); } catch (e) {}
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

  function tick() {
    var p = plan, t = now();
    if (!p || !p.items) return hide();
    var s = at(p, hm(p.start)), e = at(p, hm(p.end));
    if (t < s - 900000 || t >= e || !p.items.length) { if (cur > -1 || shown) { stopAll(); hide(); } return; }
    if (t < s) {
      if (t >= s - 240000) player(0);                            // 4 phút trước giờ phát: tải sẵn bài đầu
      probe();
      if (needTap) show('<b>Bấm OK để bật nhạc</b><span class="by">Nhạc giải lao bắt đầu lúc ' + esc(p.start) + '</span>', true);
      else hide();
      return;
    }
    var el = (t - s) / 1000, i = -1, k;
    for (k = 0; k < p.items.length; k++) if (el >= p.items[k].at && el < p.items[k].at + p.items[k].duration) { i = k; break; }
    var left = (e - t) / 1000;
    if (i < 0) {                                                 // giữa hai bài, hoặc hết danh sách
      var nx = null; for (k = 0; k < p.items.length; k++) if (p.items[k].at > el) { nx = p.items[k]; break; }
      if (cur > -1) { var old = player(cur); if (old && !old.ended && el > p.items[cur].at + p.items[cur].duration + 3) old.pause(); }
      if (nx) { show('<b>Tiếp theo: ' + esc(nx.title) + '</b><span class="by">' + (nx.fallback ? '' : esc(nx.sender) + ' · ' + esc(N.deptShort(nx.dept))) + '</span>', true); player(p.items.indexOf(nx)); }
      else show('<b>Hết bài hôm nay</b><span class="by">Quét mã bên phải để gửi bài cho buổi sau</span><span class="tm">còn ' + mmss(left) + '</span>', true);
      return;
    }
    var it = p.items[i], a = player(i), want = el - it.at;
    if (i !== cur) {
      if (cur > -1 && players[p.items[cur] && p.items[cur].id]) { drop(players[p.items[cur].id]); delete players[p.items[cur].id]; }
      cur = i; a.volume = 1;
      if (want > 3) { try { a.currentTime = want; } catch (x) {} }
      tryPlay(a);
    } else if (a.readyState > 0 && Math.abs(a.currentTime - want) > 6) {
      try { a.currentTime = want; } catch (x) {}                   // lệch giờ quá 6 giây (mạng chậm, TV khác) thì kéo về
    } else if (a.paused && !blocked && !a.ended) tryPlay(a);
    if (left < 6) a.volume = Math.max(0, left / 6);                  // nhỏ dần 6 giây cuối khung giờ
    if (p.items[i + 1] && it.at + it.duration - el < 150) player(i + 1);  // 2,5 phút cuối bài: tải sẵn bài kế (qua Apps Script 10 MB mất ~40 giây)
    show(blocked ? '<b>Bấm OK để bật nhạc</b><span class="by">TV đang chặn tự phát âm thanh</span>' : line(it) + '<span class="tm">' + mmss(want) + ' / ' + mmss(it.duration) + '</span>', blocked);
  }

  // ---------- lấy danh sách: quanh giờ phát mỗi phút, ngoài giờ 10 phút một lần ----------
  function load() {
    fetchedAt = Date.now();
    return N.call('music').then(function (p) {
      if (TEST && skew === null) {
        skew = (TEST[1] ? at(p, +TEST[1] * 60 + +TEST[2]) : at(p, hm(p.start)) - 3000) - Date.now();
        console.log('[nhạc] thử: giờ giả ' + new Date(now()).toLocaleString('vi-VN'));
      }
      var changed = !plan || plan.day !== p.day || JSON.stringify(plan.items) !== JSON.stringify(p.items);
      if (changed && plan) { stopAll(); }
      plan = p;
    }, function () {});
  }
  function near() {
    if (!plan) return true;
    var t = now(); return t > at(plan, hm(plan.start)) - 600000 && t < at(plan, hm(plan.end));
  }
  if (TEST) window.nhacDebug = function () { var a = cur > -1 && players[plan.items[cur].id]; return { now: new Date(now()).toTimeString().slice(0, 8), cur: cur, title: cur > -1 ? plan.items[cur].title : '', time: a ? Math.round(a.currentTime) : null, paused: a ? a.paused : null, blocked: blocked, strip: np.textContent }; };
  load();
  setInterval(function () {
    if (Date.now() - fetchedAt > (near() ? 60000 : 600000)) load();
    try { tick(); } catch (e) {}
  }, 1000);
})();
