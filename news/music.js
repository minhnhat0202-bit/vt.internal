// Nhạc giải lao: tab "Gửi nhạc theo yêu cầu" trên trang gửi tin (index.html#nhac) và phần dùng chung với trang duyệt nhạc (nhac.html).
// Máy chủ: phần NHẠC GIẢI LAO trong apps-script/news.gs. TV phát bằng tv/music.js.
// VTMusic.mount(phần tử) dựng khung gửi bài + hàng chờ; VTMusic.queueHTML(plan) dựng danh sách phát.
(function (W) {
  'use strict';
  const CFG = W.VTNEWS_CONFIG, N = W.VTNews, M = CFG.MUSIC || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ME_KEY = 'vtnews-me';
  const DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const mmss = (s) => { s = Math.round(+s || 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  const clock = (start, sec) => { const a = start.split(':'), m = +a[0] * 60 + +a[1] + Math.floor(sec / 60); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  function dayLabel(iso) {
    const a = iso.split('-').map(Number), d = new Date(a[0], a[1] - 1, a[2]);
    const t = N.dayKey(), name = iso === t ? 'Hôm nay' : iso === N.addDays(t, 1) ? 'Ngày mai' : DOW[d.getDay()];
    return name + ', ' + ('0' + a[2]).slice(-2) + '/' + ('0' + a[1]).slice(-2);
  }

  // Danh sách phát (GET ?action=music) → HTML; dùng ở trang gửi và trang duyệt
  function queueHTML(p, admin) {
    if (!p) return '<p class="q-empty">Đang tải hàng chờ…</p>';
    const head = `<div class="q-head"><b>${esc(dayLabel(p.day))} · ${esc(p.start)}–${esc(p.end)}</b>
      <span class="chip ${p.locked ? 'live' : 'scheduled'}">${p.locked ? 'Đã chốt' : 'Dự kiến'}</span></div>`;
    const list = p.items.length ? `<ol class="queue">${p.items.map((i) => `
      <li class="${i.fallback ? 'fb' : ''}"><time>${clock(p.start, i.at)}</time>
        <div><b>${esc(i.title)}${i.artist ? ' <span>· ' + esc(i.artist) + '</span>' : ''}</b>
        <small>${i.fallback ? 'Nhạc nền' : esc(i.sender) + ' · ' + esc(N.deptShort(i.dept))}${i.message ? ' · “' + esc(i.message) + '”' : ''}</small></div>
        <i>${mmss(i.duration)}</i></li>`).join('')}</ol>`
      : '<p class="q-empty">Chưa có bài nào. Gửi bài đầu tiên nhé!</p>';
    const more = [p.waiting && `${p.waiting} bài đã duyệt chờ buổi sau`, admin && p.pending && `${p.pending} bài chờ duyệt`].filter(Boolean).join(' · ');
    return head + list + (more ? `<p class="q-more">${more}</p>` : '') +
      (p.locked ? '' : `<p class="q-more">Danh sách chốt lúc 5 phút trước giờ phát, có thể đổi khi có bài mới được duyệt.</p>`);
  }

  // Tên file "Ca sĩ - Tên bài.mp3" → { title, artist }
  function guess(name) {
    const base = String(name || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s*[\[(].*?[\])]\s*/g, ' ').trim();
    const m = base.split(/\s+-\s+/);
    return m.length > 1 ? { artist: m[0].trim(), title: m.slice(1).join(' - ').trim() } : { title: base, artist: '' };
  }
  function readAudio(file) {
    return new Promise((res, rej) => {
      const okType = /^audio\//.test(file.type) || /\.(mp3|m4a|aac)$/i.test(file.name);
      if (!okType) return rej(new Error('Chỉ nhận file nhạc MP3 hoặc M4A'));
      if (file.size > M.maxMB * 1048576) return rej(new Error(`File ${(file.size / 1048576).toFixed(1)} MB, lớn hơn ${M.maxMB} MB. Chọn bản 128 kbps hoặc cắt ngắn bài.`));
      const url = URL.createObjectURL(file), a = new Audio();
      a.preload = 'metadata';
      a.onloadedmetadata = () => {
        const d = a.duration;
        if (!(d > 0) || !isFinite(d)) { URL.revokeObjectURL(url); return rej(new Error('Không đọc được file nhạc này')); }
        if (d > M.maxMinutes * 60) { URL.revokeObjectURL(url); return rej(new Error(`Bài dài ${mmss(d)}, quá ${M.maxMinutes} phút`)); }
        const fr = new FileReader();
        fr.onload = () => res({ url, duration: Math.round(d), name: file.name, size: file.size, type: file.type || (/\.m4a$/i.test(file.name) ? 'audio/mp4' : 'audio/mpeg'), data: String(fr.result).split(',')[1] });
        fr.onerror = () => rej(new Error('Không đọc được file'));
        fr.readAsDataURL(file);
      };
      a.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Trình duyệt không mở được file này. Đổi sang MP3 rồi thử lại.')); };
      a.src = url;
    });
  }

  function mount(root, opts) {
    opts = opts || {};
    const me = N.store(ME_KEY) || {};
    const depts = CFG.DEPARTMENTS.map((d) => `<option>${esc(d.name)}</option>`).join('');
    root.innerHTML = `
    <div class="hero">
      <div>
        <h1>Nhạc giải lao <span>${esc(M.slot)}</span></h1>
        <p>Gửi một bài hát anh chị muốn cả Trung tâm cùng nghe. Ban Truyền thông duyệt, bài vào hàng chờ và được phát trên TV giờ giải lao chiều các ngày làm việc, kèm tên và lời nhắn của anh chị.</p>
      </div>
      <ol class="steps"><li class="on">Gửi bài</li><li>Ban TT duyệt</li><li>Phát trên TV</li></ol>
    </div>
    <div class="cols">
      <form class="vtform" novalidate data-m="form">
        <input type="text" name="website" tabindex="-1" autocomplete="off" hidden>
        <section class="card"><h2>Người gửi</h2><div class="grid">
          <label class="f" data-f="dept"><span class="fl">Phòng ban <em>*</em></span><select data-m="dept"><option value="">Chọn phòng ban…</option>${depts}</select></label>
          <label class="f" data-f="sender"><span class="fl">Người gửi <em>*</em></span><input data-m="sender" maxlength="60" placeholder="Họ và tên"></label>
          <label class="f"><span class="fl">Email hoặc số điện thoại</span><input data-m="contact" maxlength="80" placeholder="ten@viettel.com.vn" autocomplete="email">
            <small class="hint">Email nhận thông báo khi bài được duyệt. Không hiện trên TV.</small></label>
        </div></section>

        <section class="card"><h2>Bài hát</h2>
          <div class="f wide" data-f="file">
            <div class="drop" tabindex="0" data-m="drop"><input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a" hidden data-m="input">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
              <span><b>Kéo file nhạc vào đây</b> hoặc <u>chọn từ máy</u></span>
              <small>MP3 hoặc M4A · tối đa ${M.maxMB} MB · dài tối đa ${M.maxMinutes} phút · không nhận link YouTube, Zing, Spotify</small></div>
            <div class="song" data-m="song" hidden></div>
            <small class="warn" data-m="ferr"></small>
          </div>
          <div class="grid" style="margin-top:14px">
            <label class="f" data-f="title"><span class="fl">Tên bài <em>*</em><i class="cnt" data-m="c-title"></i></span><input data-m="title" maxlength="${M.title}" placeholder="VD: Chúng ta của hiện tại"></label>
            <label class="f"><span class="fl">Ca sĩ</span><input data-m="artist" maxlength="${M.artist}" placeholder="VD: Sơn Tùng M-TP"></label>
          </div>
        </section>

        <section class="card"><h2>Lời nhắn trên TV</h2>
          <label class="f wide"><span class="fl">Lời nhắn kèm bài (tuỳ chọn)<i class="cnt" data-m="c-msg"></i></span>
            <input data-m="message" maxlength="${M.message}" placeholder="VD: Tặng cả phòng một buổi chiều nhẹ nhàng trước giờ chạy dự án">
            <small class="hint">Chạy ở dòng cuối màn hình TV trong lúc bài phát, kèm tên và phòng của anh chị.</small></label>
        </section>

        <div class="actions">
          <p class="errs" data-m="errs" role="alert"></p>
          <button type="button" class="btn ghost" data-m="reset">Làm lại</button>
          <button type="submit" class="btn primary lg" data-m="send">Gửi bài để duyệt</button>
        </div>
      </form>

      <aside class="side"><div class="sticky">
        <div class="panel"><h3><span class="dot"></span>Hàng chờ buổi tới</h3><div data-m="queue">${queueHTML(null)}</div></div>
        <div class="panel tips-panel"><h3>Nguyên tắc xếp hàng</h3><ul class="tips">${(M.rules || []).map((r) => `<li>${r}</li>`).join('')}</ul></div>
      </div></aside>
    </div>`;

    const $ = (k) => root.querySelector(`[data-m="${k}"]`);
    let song = null;
    const fill = () => { $('dept').value = me.dept || ''; $('sender').value = me.sender || ''; $('contact').value = me.contact || ''; };
    const counts = () => { $('c-title').textContent = $('title').value.length + '/' + M.title; $('c-msg').textContent = $('message').value.length + '/' + M.message; };
    function showSong() {
      $('song').hidden = !song; $('drop').classList.toggle('full', !!song);
      if (!song) { $('song').innerHTML = ''; return; }
      $('song').innerHTML = `<div class="s-ic"><span></span><span></span><span></span></div>
        <div class="s-info"><b>${esc(song.name)}</b><small>${mmss(song.duration)} · ${(song.size / 1048576).toFixed(1)} MB</small>
        <audio controls preload="metadata" src="${song.url}"></audio></div>
        <button type="button" class="btn ghost" data-m="drop-song">Đổi bài</button>`;
    }
    function pick(file) {
      if (!file) return;
      $('ferr').textContent = ''; $('drop').classList.add('busy');
      readAudio(file).then((s) => {
        if (song) URL.revokeObjectURL(song.url);
        song = s; showSong();
        const g = guess(s.name);
        if (!$('title').value.trim()) $('title').value = g.title.slice(0, M.title);
        if (!$('artist').value.trim()) $('artist').value = g.artist.slice(0, M.artist);
        counts(); root.querySelector('[data-f="file"]').classList.remove('err');
      }, (e) => { $('ferr').textContent = e.message; }).then(() => $('drop').classList.remove('busy'));
    }
    $('drop').addEventListener('click', () => $('input').click());
    $('drop').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('input').click(); } });
    $('input').addEventListener('change', () => { pick($('input').files[0]); $('input').value = ''; });
    ['dragenter', 'dragover'].forEach((t) => $('drop').addEventListener(t, (e) => { e.preventDefault(); $('drop').classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => $('drop').addEventListener(t, (e) => { e.preventDefault(); $('drop').classList.remove('over'); }));
    $('drop').addEventListener('drop', (e) => pick(e.dataTransfer.files[0]));
    $('song').addEventListener('click', (e) => { if (e.target.closest('[data-m="drop-song"]')) { URL.revokeObjectURL(song.url); song = null; showSong(); } });
    root.addEventListener('input', (e) => { counts(); const f = e.target.closest('.f'); if (f) f.classList.remove('err'); });

    function clear() { if (song) URL.revokeObjectURL(song.url); song = null; showSong(); ['title', 'artist', 'message'].forEach((k) => { $(k).value = ''; }); fill(); counts(); $('errs').textContent = ''; $('ferr').textContent = ''; }
    $('reset').addEventListener('click', () => { if (confirm('Xoá toàn bộ nội dung đang điền?')) clear(); });

    $('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (k) => $(k).value.trim(), errs = [];
      [['dept', 'Phòng ban'], ['sender', 'Người gửi'], ['title', 'Tên bài']].forEach(([k, t]) => { if (!v(k)) { errs.push(t); root.querySelector(`[data-f="${k}"]`).classList.add('err'); } });
      if (!song) { errs.unshift('File nhạc'); root.querySelector('[data-f="file"]').classList.add('err'); }
      $('errs').textContent = errs.length ? 'Còn thiếu: ' + errs.join(' · ') : '';
      if (errs.length) return;
      const record = { dept: v('dept'), sender: v('sender'), contact: v('contact'), title: v('title'), artist: v('artist'), message: v('message'),
        duration: song.duration, website: root.querySelector('[name="website"]').value };
      const btn = $('send'); btn.disabled = true; btn.textContent = `Đang tải bài lên (${(song.size / 1048576).toFixed(1)} MB)…`;
      N.call('music_submit', { record, file: { name: song.name, type: song.type, data: song.data } }).then((j) => {
        Object.assign(me, { dept: record.dept, sender: record.sender, contact: record.contact }); N.store(ME_KEY, me);
        if (opts.onDone) opts.onDone(j.record.id, record);
        clear(); refresh();
      }).catch((err) => {
        $('errs').textContent = 'Chưa gửi được: ' + err.message + '.';
      }).then(() => { btn.disabled = false; btn.textContent = 'Gửi bài để duyệt'; });
    });

    function refresh() {
      if (N.isDemo()) { $('queue').innerHTML = '<p class="q-empty">Chế độ thử: hàng chờ nhạc cần nối máy chủ.</p>'; return; }
      N.call('music').then((p) => { $('queue').innerHTML = queueHTML(p); }, () => { $('queue').innerHTML = '<p class="q-empty">Chưa tải được hàng chờ.</p>'; });
    }
    fill(); counts(); refresh();
    setInterval(() => { if (!document.hidden && root.offsetParent) refresh(); }, 60000);
    return { refresh };
  }

  W.VTMusic = { mount, queueHTML, dayLabel, mmss, clock, esc };
})(window);
