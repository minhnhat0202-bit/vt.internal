// Nhạc giải lao trên Bản tin TV: phát danh sách GET ?action=music (phần NHẠC GIẢI LAO trong apps-script/news.gs)
// trong khung start–end. Bài nào, giây thứ mấy đều tính theo giờ thực, nên nhiều TV phát khớp nhau và trang tự tải lại
// giữa chừng vẫn phát tiếp đúng chỗ. Trong giờ nhạc, khung "Giờ giải lao" nổi lên phủ cột phải (Hôm nay, Sắp diễn ra).
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

  // ---------- giao diện: khung "Giờ giải lao" nổi lên phủ cột phải (Hôm nay + Sắp diễn ra) trong giờ nhạc ----------
  // Cùng kiểu khung kính, nhãn đỏ của trang; Tin tiêu điểm bên trái và dòng chạy vẫn chạy bình thường.
  var css = document.createElement('style');
  css.textContent =
    '.mpop { position: absolute; top: 136px; right: 64px; bottom: 144px; width: 470px; z-index: 4; display: flex; flex-direction: column; padding: 46px 30px 24px; background: rgba(12,12,14,.93); border-color: rgba(238,0,51,.55); box-shadow: 0 28px 70px rgba(0,0,0,.6), 0 0 60px rgba(238,0,51,.22); opacity: 0; visibility: hidden; transform: translateX(60px); transition: opacity .6s ease, transform .6s ease, visibility 0s .6s; }' +
    '.mpop.on { opacity: 1; visibility: visible; transform: none; transition: opacity .6s ease, transform .6s ease; }' +
    '.mpop .disc { flex: none; position: relative; width: 210px; height: 210px; margin: 6px auto 22px; border-radius: 50%; background: repeating-radial-gradient(circle, #000 0 2px, #1d1f21 2px 4px); box-shadow: 0 0 0 5px rgba(255,255,255,.07), 0 18px 44px rgba(0,0,0,.7), 0 0 70px rgba(238,0,51,.28); }' +
    '.mpop .disc i { position: absolute; left: 33%; top: 33%; right: 33%; bottom: 33%; border-radius: 50%; background: var(--red); display: flex; align-items: center; justify-content: center; color: #fff; font-style: normal; font-size: 34px; line-height: 1; }' +
    '.mpop .disc i::after { content: ""; position: absolute; left: 50%; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #000; }' +
    '.mpop .disc i b { position: absolute; left: 14%; top: 10%; font-weight: 400; }' +
    '.mpop .disc::after { content: ""; position: absolute; left: 0; top: 0; right: 0; bottom: 0; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,.14), transparent 40%, transparent 60%, rgba(255,255,255,.06)); }' +
    '.mpop.play .disc { animation: mp-spin 4s linear infinite; }' +
    '.mpop .kick { display: flex; align-items: center; font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: .12em; text-transform: uppercase; color: var(--red); }' +
    '.mpop .eq { display: none; align-items: flex-end; height: 22px; margin-right: 12px; }' +
    '.mpop.play .eq { display: flex; }' +
    '.mpop .eq i { width: 5px; height: 40%; margin-right: 4px; border-radius: 2px; background: var(--red); animation: mp-eq 1s ease-in-out infinite alternate; }' +
    '.mpop .eq i:nth-child(2) { animation-delay: -.35s; } .mpop .eq i:nth-child(3) { animation-delay: -.7s; } .mpop .eq i:nth-child(4) { animation-delay: -.15s; }' +
    '.mpop .ttl { margin: 10px 0 0; font-family: var(--display); font-weight: 800; font-size: 36px; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }' +
    '.mpop .art { margin-top: 6px; font-size: 26px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
    '.mpop .bar { height: 8px; margin-top: 20px; border-radius: 4px; background: rgba(255,255,255,.14); overflow: hidden; }' +
    '.mpop .bar b { display: block; height: 100%; width: 0; background: var(--red); border-radius: 4px; transition: width 1s linear; }' +
    '.mpop .tm { display: flex; justify-content: space-between; margin-top: 8px; font-size: 22px; color: var(--ink-3); font-variant-numeric: tabular-nums; }' +
    '.mpop .gift { margin-top: 18px; padding-top: 16px; border-top: 1.5px solid rgba(255,255,255,.14); font-size: 24px; color: var(--ink-2); }' +
    '.mpop .gift small { display: block; font-size: 19px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 4px; }' +
    '.mpop .gift b { color: var(--ink); font-size: 28px; }' +
    '.mpop .gift p { margin: 8px 0 0; font-size: 27px; line-height: 1.3; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }' +
    '.mpop .gift p::before { content: "“"; color: var(--red); font-family: var(--display); font-weight: 800; margin-right: 4px; }' +
    '.mpop .gift p::after { content: "”"; color: var(--red); font-family: var(--display); font-weight: 800; margin-left: 2px; }' +
    '.mpop .foot { margin-top: auto; padding-top: 14px; font-size: 22px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
    '.mpop .foot b { color: var(--ink-2); font-weight: 500; }' +
    '.mpop .ok { flex: none; width: 120px; height: 120px; margin: 30px auto 10px; border-radius: 50%; border: 5px solid var(--ink); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 800; font-size: 44px; animation: mp-pulse 1.6s ease-in-out infinite; }' +
    '@keyframes mp-spin { to { transform: rotate(360deg); } }' +
    '@keyframes mp-eq { from { height: 20%; } to { height: 100%; } }' +
    '@keyframes mp-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(238,0,51,.6); } 50% { box-shadow: 0 0 0 22px rgba(238,0,51,0); } }' +
    '@media (prefers-reduced-motion: reduce) { .mpop.play .disc, .mpop .eq i, .mpop .ok { animation: none; } }';
  document.head.appendChild(css);
  var stage = document.getElementById('stage') || document.body;
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
  // v: { kind: 'play' | 'next' | 'end' | 'tap', it, el (giây đã phát), left (giây còn lại tới bài kế / hết giờ) }
  function show(v) {
    var p = plan, it = v.it, sig = v.kind + '|' + (it ? it.id : '') + '|' + p.items.length;
    if (sig !== popSig) {
      popSig = sig;
      var h = '<span class="lbl">Giờ giải lao</span><span class="pg">' + esc(p.start) + ' – ' + esc(p.end) + '</span>';
      if (v.kind === 'tap') h += '<div class="ok">OK</div><div class="kick">Chưa có tiếng</div><h3 class="ttl">Bấm OK trên điều khiển để bật nhạc</h3>' +
        '<div class="art">' + (v.pre ? 'Nhạc bắt đầu lúc ' + esc(p.start) : 'TV đang chặn tự phát âm thanh') + '</div>' + (it ? '<div class="foot">' + (v.pre ? 'Bài đầu tiên' : 'Đang tới lượt') + ': <b>' + esc(it.title) + '</b></div>' : '');
      else if (v.kind === 'end') h += '<div class="disc"><i><b>♪</b></i></div><div class="kick">Hết bài hôm nay</div><h3 class="ttl">Muốn nghe bài của mình?</h3>' +
        '<div class="art">Quét mã góc phải dưới để gửi bài</div><div class="tm"><span>Giờ giải lao còn</span><span data-x="left"></span></div><div class="foot">Bài được duyệt sẽ phát buổi tới</div>';
      else h += '<div class="disc"><i><b>♪</b></i></div><div class="kick"><span class="eq"><i></i><i></i><i></i><i></i></span>' + (v.kind === 'play' ? 'Đang phát' : 'Sắp phát · ' + hhmm(p, it.at)) + '</div>' +
        '<h3 class="ttl">' + esc(it.title) + '</h3>' + (it.artist ? '<div class="art">' + esc(it.artist) + '</div>' : '') +
        (v.kind === 'play' ? '<div class="bar"><b data-x="bar"></b></div><div class="tm"><span data-x="el"></span><span>' + mmss(it.duration) + '</span></div>'
          : '<div class="tm"><span>Bắt đầu sau</span><span data-x="left"></span></div>') + gift(it) + after(p, it);
      pop.innerHTML = h;
    }
    pop.className = 'mpop glass panel on ' + v.kind;
    var x = pop.querySelectorAll('[data-x]'), k;
    for (k = 0; k < x.length; k++) {
      var f = x[k].getAttribute('data-x');
      if (f === 'el') x[k].textContent = mmss(v.el);
      else if (f === 'left') x[k].textContent = mmss(v.left);
      else if (f === 'bar') x[k].style.width = Math.min(100, v.el / it.duration * 100) + '%';
    }
    shown = true;
  }
  function hide() { if (!shown) return; pop.className = 'mpop glass panel'; popSig = ''; shown = false; }

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
      if (nx) { show({ kind: 'next', it: nx, left: nx.at - el }); player(p.items.indexOf(nx)); }
      else show({ kind: 'end', left: left });
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
    show(blocked ? { kind: 'tap', it: it } : { kind: 'play', it: it, el: want });
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
      if (plan && !same) stopAll();
      plan = p;
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
