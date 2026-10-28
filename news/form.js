// Khung nhập tin dùng chung cho trang gửi tin (index.html) và trang duyệt (duyet.html).
// VTForm.mount(phần tử, record, { admin, onChange }) → { get, payload, validate, set }
(function (W) {
  'use strict';
  const CFG = W.VTNEWS_CONFIG, N = W.VTNews, L = CFG.LIMITS;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const getK = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
  const putK = (o, k, v) => { const ps = k.split('.'); let a = o; ps.slice(0, -1).forEach((p) => { a = a[p] = Object.assign({}, a[p]); }); a[ps[ps.length - 1]] = v; };

  // Cảnh báo mềm: vẫn gửi được nhưng nhắc người gửi điều sẽ xảy ra trên TV
  const WARN = {
    title: (v) => (v.length > L.title2 ? `Dài hơn ${L.title2} ký tự: trên TV sẽ xuống 2 dòng.` : ''),
    sub: (v, r) => (v.length + N.deptShort(r.dept).length > 90 ? 'Dòng phụ kèm tên phòng có thể bị cắt trên TV.' : '')
  };

  function field(k, label, o = {}) {
    const attrs = `data-k="${k}"${o.max ? ` maxlength="${o.max}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.list ? ` list="${o.list}"` : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.maxNum != null ? ` max="${o.maxNum}"` : ''}`;
    const ctl = o.rows ? `<textarea ${attrs} rows="${o.rows}"></textarea>`
      : o.options ? `<select ${attrs}><option value="">${esc(o.ph || 'Chọn…')}</option>${o.options.map((v) => `<option>${esc(v)}</option>`).join('')}</select>`
      : `<input ${attrs} type="${o.type || 'text'}"${o.type === 'email' ? ' autocomplete="email"' : ''}>`;
    return `<label class="f${o.wide ? ' wide' : ''}" data-f="${k}">
      <span class="fl">${esc(label)}${o.req ? ' <em>*</em>' : ''}${o.max ? `<i class="cnt" data-cnt="${k}"></i>` : ''}</span>
      ${ctl}${o.hint ? `<small class="hint">${o.hint}</small>` : ''}<small class="warn" data-warn="${k}"></small></label>`;
  }

  // Sơ đồ màn hình TV, tô đỏ vùng tin sẽ hiện
  const MAP = `<svg class="tvmap" viewBox="0 0 192 108" role="img" aria-label="Sơ đồ màn hình Bản tin TV">
    <rect x="0" y="0" width="192" height="108" rx="4" class="z-bg"/>
    <rect x="6" y="3" width="110" height="5" rx="1" class="z-dim"/>
    <rect x="6" y="13" width="124" height="78" rx="4" class="z z-big" data-z="story"/>
    <text x="68" y="55" class="z-t" data-z-t="story" style="font-size:7px">Tin tiêu điểm</text>
    <rect x="135" y="13" width="51" height="45" rx="3" class="z" data-z="agenda"/>
    <text x="160.5" y="37.5" class="z-t" data-z-t="agenda">Hôm nay</text>
    <rect x="135" y="61" width="51" height="30" rx="3" class="z" data-z="agenda"/>
    <text x="160.5" y="78" class="z-t" data-z-t="agenda">Sắp diễn ra</text>
    <rect x="0" y="96" width="140" height="12" class="z" data-z="ticker"/>
    <text x="70" y="104.5" class="z-t" data-z-t="ticker">Dòng chạy</text>
    <rect x="140" y="96" width="52" height="12" class="z-dim"/>
    <text x="166" y="104" class="z-t" style="font-size:4.6px">Mã QR gửi tin</text>
  </svg>`;

  const WHERE = [
    ['story', 'Tin kèm ảnh', 'Khung lớn Tin tiêu điểm: chiếu lần lượt các ảnh kèm tiêu đề và tên phòng, nối sau các tin chính của Trung tâm.'],
    ['agenda', 'Lịch sự kiện', 'Hai khung Hôm nay và Sắp diễn ra bên phải. Dùng cho buổi họp, hội thảo, giải đấu có ngày giờ.'],
    ['ticker', 'Dòng chạy', 'Một câu chạy ngang cuối màn hình. Dùng cho thông báo ngắn, chúc mừng.']
  ];

  function template(admin) {
    const depts = CFG.DEPARTMENTS.map((d) => d.name);
    return `
    <datalist id="vt-tags">${CFG.TAGS.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <section class="card" data-sec="who"><h2>Đơn vị gửi</h2><div class="grid">
      ${field('dept', 'Phòng ban', { req: true, options: depts, ph: 'Chọn phòng ban…' })}
      ${field('sender', 'Người gửi', { req: true, max: 60, ph: 'Họ và tên' })}
      ${field('contact', 'Email hoặc số điện thoại', { max: 80, ph: 'ten@viettel.com.vn', hint: 'Ban Truyền thông liên hệ khi cần bổ sung; email nhận thông báo khi tin được duyệt.' })}
    </div></section>

    <section class="card" data-sec="where"><h2>Tin hiện ở đâu trên TV</h2>
      <p class="lead">Chọn một hoặc nhiều vị trí. Mỗi vị trí mở thêm phần cần điền bên dưới.</p>
      <div class="where">${MAP}<div class="opts">${WHERE.map(([k, t, d]) => `
        <label class="opt"><input type="checkbox" data-k="where.${k}"><span><b>${t}</b><small>${d}</small></span></label>`).join('')}
      </div></div>
      <small class="warn" data-warn="where"></small>
    </section>

    <section class="card" data-sec="story" hidden><h2>Tin kèm ảnh</h2><div class="grid">
      ${field('title', 'Tiêu đề', { req: true, wide: true, max: L.title, ph: 'VD: Phòng Hạ tầng Cloud hoàn thành chuyển đổi 500 máy chủ', hint: 'Viết như tít báo: ai, làm gì. Trên TV hiện tối đa 2 dòng.' })}
      ${field('tab', 'Nhóm tin', { req: true, options: CFG.GROUPS.map((g) => g.name), ph: 'Chọn nhóm…', hint: 'Tab trên thanh Tin tiêu điểm mà tin sẽ nằm trong.' })}
      ${field('tag', 'Nhãn nổi bật', { max: L.tag, list: 'vt-tags', ph: 'VD: Vinh danh', hint: 'Ô vàng góc ảnh, tuỳ chọn.' })}
      ${field('sub', 'Dòng phụ', { wide: true, max: L.sub, ph: 'VD: Hoàn thành trước kế hoạch 2 tuần · 15/10/2026', hint: 'Một dòng dưới tiêu đề. Tên phòng ban được tự thêm vào cuối.' })}
      <div class="f wide" data-f="images"><span class="fl">Ảnh <em>*</em><i class="cnt" data-cnt="images"></i></span>
        <div class="drop" tabindex="0"><input type="file" accept="image/*" multiple hidden>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l4.5-4.5 3 3L16 10l4 4M4 5h16v14H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          <span><b>Kéo ảnh vào đây</b>, dán (Ctrl+V) hoặc <u>chọn từ máy</u></span>
          <small>Tối đa ${CFG.MAX_IMAGES} ảnh · ảnh ngang 16:9 đẹp nhất · TV chiếu lần lượt, ảnh đầu tiên lên trước</small></div>
        <ol class="thumbs"></ol><small class="warn" data-warn="images"></small></div>
      ${field('videoLink', 'Link video (nếu có)', { wide: true, type: 'url', ph: 'Link Google Drive, OneDrive…', hint: 'Video gửi qua link; Ban Truyền thông sẽ chuyển định dạng và đưa lên.' })}
    </div></section>

    <section class="card" data-sec="agenda" hidden><h2>Lịch sự kiện</h2><div class="grid">
      ${field('event.title', 'Tên sự kiện', { req: true, wide: true, max: L.agenda, ph: 'VD: Hội thảo An toàn thông tin quý IV' })}
      ${field('event.from', 'Ngày bắt đầu', { req: true, type: 'date' })}
      ${field('event.to', 'Ngày kết thúc', { type: 'date', hint: 'Chỉ điền khi kéo dài nhiều ngày.' })}
      ${field('event.time', 'Giờ', { max: 20, ph: 'VD: 14:00' })}
      ${field('event.place', 'Địa điểm', { max: L.place, ph: 'VD: Phòng họp tầng 5' })}
    </div></section>

    <section class="card" data-sec="ticker" hidden><h2>Dòng chạy</h2><div class="grid">
      ${field('ticker', 'Câu thông báo', { req: true, wide: true, rows: 2, max: L.ticker, ph: 'VD: Chúc mừng P. Trí tuệ nhân tạo đạt giải Nhất cuộc thi Sáng kiến 2026', hint: 'Một câu, không xuống dòng.' })}
    </div></section>

    <section class="card" data-sec="time"><h2>Thời gian lên TV</h2><div class="grid">
      ${field('showFrom', 'Bắt đầu chiếu', { req: true, type: 'date' })}
      ${field('showUntil', 'Chiếu đến hết ngày', { req: true, type: 'date', hint: `Mặc định ${CFG.DEFAULT_DAYS} ngày. Hết hạn tin tự rời TV.` })}
      ${field('message', admin ? 'Lời nhắn của đơn vị' : 'Lời nhắn cho Ban Truyền thông', { wide: true, rows: 3, max: 500, ph: 'Thông tin thêm, yêu cầu đặc biệt, tên người trong ảnh…' })}
    </div></section>
    ${admin ? `
    <section class="card admin" data-sec="admin"><h2>Biên tập</h2><div class="grid">
      <label class="f check"><input type="checkbox" data-k="pin"><span><b>Ghim lên đầu Tin tiêu điểm</b><small>Mặc định tin chiếu nối sau các tin chính của Trung tâm. Chọn cho tin nổi bật để tin đứng đầu khung.</small></span></label>
      ${field('slideSeconds', 'Giây mỗi ảnh', { type: 'number', min: 4, maxNum: 30, ph: String(CFG.SLIDE_SECONDS), hint: 'Khi tin có nhiều ảnh.' })}
      ${field('note', 'Phản hồi cho đơn vị', { wide: true, rows: 2, max: 500, ph: 'Bắt buộc khi từ chối. Gửi kèm email thông báo nếu đơn vị để lại email.' })}
    </div></section>` : ''}`;
  }

  function readImage(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const W0 = im.naturalWidth, H0 = im.naturalHeight, k = Math.min(1, CFG.IMAGE_EDGE / Math.max(W0, H0));
        const c = document.createElement('canvas'); c.width = Math.round(W0 * k); c.height = Math.round(H0 * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        res({ url: c.toDataURL('image/jpeg', 0.85), w: W0, h: H0, name: (file.name || 'anh').replace(/\.[^.]+$/, '') + '.jpg', isNew: true });
      };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error(`${file.name}: không đọc được ảnh. Ảnh HEIC từ iPhone hãy chuyển sang JPG trước.`)); };
      im.src = u;
    });
  }
  function imgWarn(i) {
    if (!i.w) return '';
    if (i.w / i.h < 1.2) return 'Ảnh dọc hoặc vuông: TV hiện kèm nền mờ hai bên';
    if (Math.max(i.w, i.h) < 1200) return 'Ảnh nhỏ, có thể mờ trên TV';
    return '';
  }

  function mount(root, rec, opts = {}) {
    let base = JSON.parse(JSON.stringify(rec || {}));
    let imgs = [];
    root.innerHTML = template(opts.admin);
    root.classList.add('vtform');
    const $$ = (s) => Array.from(root.querySelectorAll(s));
    const thumbs = root.querySelector('.thumbs'), drop = root.querySelector('.drop'), fileIn = drop.querySelector('input');
    let tChange;
    const changed = () => { clearTimeout(tChange); tChange = setTimeout(() => opts.onChange && opts.onChange(get()), 500); };

    function sync() {
      const r = get();
      ['story', 'agenda', 'ticker'].forEach((z) => {
        const on = !!(r.where && r.where[z]);
        root.querySelector(`[data-sec="${z}"]`).hidden = !on;
        $$(`[data-z="${z}"],[data-z-t="${z}"]`).forEach((e) => e.classList.toggle('on', on));
      });
      $$('[data-cnt]').forEach((e) => {
        const k = e.dataset.cnt;
        if (k === 'images') { e.textContent = imgs.length + ' / ' + CFG.MAX_IMAGES; return; }
        const inp = root.querySelector(`[data-k="${k}"]`), n = inp.value.length, m = +inp.maxLength;
        e.textContent = n ? n + ' / ' + m : ''; e.classList.toggle('hi', n >= m * 0.9);
      });
      Object.keys(WARN).forEach((k) => { const e = root.querySelector(`[data-warn="${k}"]`); if (e) e.textContent = WARN[k](getK(r, k) || '', r); });
      const g = CFG.GROUPS.filter((x) => x.name === r.tab)[0];
      root.querySelector('[data-k="tab"]').closest('.f').querySelector('.hint').textContent = g ? g.desc : 'Tab trên thanh Tin tiêu điểm mà tin sẽ nằm trong.';
      const d = CFG.DEPARTMENTS.filter((x) => x.name === r.dept)[0];
      root.querySelector('[data-k="sub"]').closest('.f').querySelector('.hint').textContent =
        'Một dòng dưới tiêu đề. ' + (d && d.short ? `Trên TV tự thêm “ · ${d.short}” vào cuối.` : 'Tên phòng ban được tự thêm vào cuối.');
    }
    function drawThumbs() {
      thumbs.innerHTML = imgs.map((i, k) => `<li><img src="${esc(i.url)}" alt="">
        <span class="n">${k + 1}</span>
        <div class="tb"><button type="button" data-mv="-1" title="Lên trước" ${k ? '' : 'disabled'}>‹</button><button type="button" data-mv="1" title="Ra sau" ${k < imgs.length - 1 ? '' : 'disabled'}>›</button><button type="button" data-rm title="Bỏ ảnh">×</button></div>
        ${imgWarn(i) ? `<small>${imgWarn(i)}</small>` : ''}</li>`).join('');
      drop.classList.toggle('full', imgs.length >= CFG.MAX_IMAGES);
      sync();
    }
    async function addFiles(files) {
      const warn = root.querySelector('[data-warn="images"]'); warn.textContent = '';
      const list = Array.from(files).filter((f) => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
      const room = CFG.MAX_IMAGES - imgs.length;
      if (list.length > room) warn.textContent = `Chỉ nhận thêm ${room} ảnh (tối đa ${CFG.MAX_IMAGES}).`;
      drop.classList.add('busy');
      for (const f of list.slice(0, room)) {
        try { imgs.push(await readImage(f)); } catch (e) { warn.textContent = e.message; }
      }
      drop.classList.remove('busy'); drawThumbs(); changed();
    }

    drop.addEventListener('click', () => fileIn.click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
    fileIn.addEventListener('change', () => { addFiles(fileIn.files); fileIn.value = ''; });
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    root.addEventListener('paste', (e) => {
      const fs = Array.from(e.clipboardData ? e.clipboardData.files : []);
      if (fs.length && !root.querySelector('[data-sec="story"]').hidden) { e.preventDefault(); addFiles(fs); }
    });
    thumbs.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = Array.from(thumbs.children).indexOf(b.closest('li'));
      if (b.hasAttribute('data-rm')) imgs.splice(k, 1);
      else { const j = k + +b.dataset.mv; [imgs[k], imgs[j]] = [imgs[j], imgs[k]]; }
      drawThumbs(); changed();
    });
    root.addEventListener('input', (e) => { e.target.closest('.f, .opt') && e.target.closest('.f, .opt').classList.remove('err'); sync(); changed(); });
    root.addEventListener('change', () => { sync(); changed(); });

    function get() {
      const r = JSON.parse(JSON.stringify(base));
      $$('[data-k]').forEach((e) => putK(r, e.dataset.k, e.type === 'checkbox' ? e.checked : e.type === 'number' ? (e.value ? +e.value : '') : e.value.trim()));
      r.images = imgs.map((i) => (i.isNew ? { url: i.url, w: i.w, h: i.h, isNew: true, name: i.name } : i));
      return r;
    }
    // Dạng gửi lên máy chủ: ảnh mới tách ra files, chỗ của nó trong images ghi { new: k }
    function payload() {
      const r = get(), files = [];
      r.images = r.images.map((i) => {
        if (!i.isNew) return i;
        files.push({ name: i.name, type: 'image/jpeg', data: i.url.split(',')[1], w: i.w, h: i.h });
        return { new: files.length - 1 };
      });
      return { record: r, files };
    }
    function set(r) {
      base = JSON.parse(JSON.stringify(r || {}));
      if (!base.showFrom) base.showFrom = N.dayKey();
      if (!base.showUntil) base.showUntil = N.addDays(base.showFrom, CFG.DEFAULT_DAYS - 1);
      if (!base.where) base.where = { story: true };
      $$('[data-k]').forEach((e) => { const v = getK(base, e.dataset.k); if (e.type === 'checkbox') e.checked = !!v; else e.value = v == null ? '' : v; });
      $$('.err').forEach((e) => e.classList.remove('err'));
      imgs = (base.images || []).slice();
      drawThumbs();
    }
    function validate() {
      const r = get(), errs = [];
      const bad = (k, msg) => { errs.push(msg); const f = root.querySelector(`[data-f="${k}"]`); if (f) f.classList.add('err'); };
      $$('.err').forEach((e) => e.classList.remove('err'));
      if (!r.dept) bad('dept', 'Chọn phòng ban');
      if (!r.sender) bad('sender', 'Điền tên người gửi');
      const w = r.where || {};
      if (!w.story && !w.agenda && !w.ticker) { errs.push('Chọn ít nhất một vị trí trên TV'); $$('.opt').forEach((e) => e.classList.add('err')); }
      if (w.story) { if (!r.title) bad('title', 'Điền tiêu đề tin'); if (!CFG.GROUPS.some((x) => x.name === r.tab)) bad('tab', 'Chọn nhóm tin'); if (!imgs.length) bad('images', 'Tin kèm ảnh cần ít nhất 1 ảnh'); }
      if (w.agenda) {
        if (!r.event.title) bad('event.title', 'Điền tên sự kiện');
        if (!r.event.from) bad('event.from', 'Chọn ngày bắt đầu sự kiện');
        if (r.event.to && r.event.from && r.event.to < r.event.from) bad('event.to', 'Ngày kết thúc sự kiện phải sau ngày bắt đầu');
      }
      if (w.ticker && !r.ticker) bad('ticker', 'Điền câu cho dòng chạy');
      if (!r.showFrom) bad('showFrom', 'Chọn ngày bắt đầu chiếu');
      if (!r.showUntil) bad('showUntil', 'Chọn ngày kết thúc chiếu');
      else if (r.showFrom && r.showUntil < r.showFrom) bad('showUntil', 'Ngày kết thúc chiếu phải sau ngày bắt đầu');
      const first = root.querySelector('.err');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return errs;
    }

    set(rec);
    return { get, payload, validate, set };
  }

  W.VTForm = { mount, esc };
})(window);
