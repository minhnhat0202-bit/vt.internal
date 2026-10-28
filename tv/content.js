// =====================================================================
// NỘI DUNG BẢN TIN TV · trang tv/index.html
// Việc hằng ngày (thêm tin, đổi lịch, đổi dòng chạy) CHỈ sửa file này, không cần đụng tv/index.html.
// Đường dẫn ảnh, video viết tính từ gốc repo: 'img/...', 'media/...' (trang tự thêm ../).
// Sửa xong: commit + push, TV tự tải lại trong khoảng 2 phút.
// =====================================================================
window.TV = {

  // Thời lượng mặc định mỗi tin (giây), khi tin không khai seconds.
  STORY_SECONDS: 60,

  // ---- Tin tiêu điểm: tin xếp theo nhóm, trong nhóm theo thứ tự mảng. ----
  //   tab = nhóm tin, một trong: 'Đời sống', 'Kinh doanh', 'Công nghệ', 'Phong trào', 'Sự kiện' (mô tả nhóm: GROUPS trong news/config.js)
  //   id, title (tiêu đề), tag (nhãn vàng, tuỳ chọn), sub (dòng phụ, chỉ để ghi chú: TV không còn hiện)
  //   seconds: thời lượng riêng · ticker: câu (hoặc mảng câu) thêm vào dòng chạy
  //   until: 'YYYY-MM-DD' = tự ẩn tin sau ngày này (tuỳ chọn)
  // Chọn MỘT kiểu nội dung:
  //   source: 'drive'   ảnh, video từ Google Drive (media.js) có bộ đếm; intro = thẻ mở đầu kèm pháo hoa;
  //                     photoSeconds = giây mỗi ảnh; shuffle = chiếu ngẫu nhiên không lặp
  //   slides: [{ src, sub? }], slideSeconds   chiếu lần lượt nhiều ảnh, có bộ đếm n / tổng.
  //                     until của từng ảnh: ảnh tự ẩn sau ngày đó. Không khai seconds thì thời lượng
  //                     tin = số ảnh × slideSeconds.
  //   items: [{ type: 'video', src }, { type: 'image', src, seconds? }]   video phát hết thì sang mục kế
  //   image: 'img/...'  một poster tĩnh
  // Ảnh ngang tự phủ kín khung (cắt bớt trên dưới). Poster không dựng đúng 1920×994 thì khai fit: 'contain' (cả tin hoặc từng ảnh) để hiện trọn.
  STORIES: [
    { id: 'dam-cuoi-nam-ha', tab: 'Đời sống', title: 'Đám cưới Phương Nam & Việt Hà', sub: '08:30 Thứ Tư 28/10', until: '2026-10-28', seconds: 15,
      image: 'img/daily-2026-10-26.jpg?v=3' },

    { id: 'anl-4', tab: 'Sự kiện', title: 'VTNet đạt ANL 4.0 TM Forum', tag: 'Vinh danh', sub: 'Tối ưu năng lượng & chất lượng', until: '2026-11-02', seconds: 15, fit: 'contain',
      image: 'img/daily-2026-10-27-1.jpg',
      ticker: 'VTNet đạt ANL 4.0 TM Forum: Tối ưu năng lượng & chất lượng' },

    { id: 'recap-the-thao', tab: 'Phong trào', title: 'Recap Giải Thể thao tháng 10', seconds: 66,
      items: [{ type: 'video', src: 'media/daily-2026-10-27.mp4?v=2' }] },

    { id: 'phu-nu-20-10', tab: 'Đời sống', title: 'CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10',
      until: '2026-10-25', slideSeconds: 8,
      // Gộp cả tin P. Kiểm soát Chất lượng gửi qua news/ (ảnh 1, 2) và ảnh buổi chúc mừng 20/10 (ảnh 3 đến 10)
      slides: [{ src: 'img/daily-2026-10-19.jpg?v=2' }].concat([1, 2, 3, 4, 11, 6, 7, 8, 9, 10].map(function (n) {
        return { src: 'img/daily-2026-10-20-' + n + '.jpg' }; })),
      ticker: 'Chúc mừng Ngày Phụ nữ Việt Nam 20/10 · Yêu thương & Tôn vinh' },

    // Một tab gộp kết quả mọi giải đã xong. Môn mới có kết quả: thêm một dòng vào slides.
    { id: 'ket-qua', tab: 'Phong trào', title: 'Giải Thể thao tháng 10', slideSeconds: 20,
      // 6 ảnh lễ bế mạc, trao giải tối 23/10 (thay banner Chung kết & liên hoan), mỗi ảnh 8 giây; poster vô địch giữ 20 giây
      slides: [1, 2, 3, 4, 5, 6].map(function (n) {
        return { src: 'img/daily-2026-10-23-' + n + '.jpg', seconds: 8, sub: 'Bế mạc & trao giải · Thứ Sáu 23/10 · Sân bóng Đình Thôn 2' }; }).concat([
        { src: 'img/ket-qua-cau-long.jpg?v=2', fit: 'contain', sub: 'Cầu lông · Vô địch: Hiếu – Thảo' },
        { src: 'img/ket-qua-pes.jpg', fit: 'contain', sub: 'PES · Vô địch: Hiếu & Trung' },
        { src: 'img/ket-qua-bida.jpg', fit: 'contain', sub: 'Bida · Vô địch: Lê Văn Thành & Trần Phan Huy Anh' }
      ]),
      ticker: ['Giải Thể thao tháng 10 đã bế mạc tối Thứ Sáu 23/10 · Chúc mừng các đội và vận động viên đạt giải', 'Vô địch Cầu lông: Hiếu – Thảo', 'Vô địch PES: Hiếu & Trung',
        'Kết quả Bida · Nhất: Lê Văn Thành & Trần Phan Huy Anh · Nhì: Lê Ngọc Thái & Phạm Gia Khiêm · Ba: Nguyễn Nhật Minh & Lê Quốc Đạt · Tư: Nguyễn Xuân Huy & Lê Hải Sơn'] },

    { id: 'vda-2026', tab: 'Sự kiện', title: 'Giải thưởng Chuyển đổi số Việt Nam 2026', tag: 'Vinh danh',
      sub: 'Hệ thống Quản lý vùng phủ mạng vô tuyến · Viettel Networks',
      items: [{ type: 'video', src: 'media/daily-2026-10-14.mp4' }, { type: 'image', src: 'img/daily-2026-10-14.jpg', seconds: 10 },
        { type: 'image', src: 'img/daily-2026-10-15-1.jpg', seconds: 7 }, { type: 'image', src: 'img/daily-2026-10-15-2.jpg', seconds: 7 },
        { type: 'image', src: 'img/daily-2026-10-15-3.jpg', seconds: 7 }, { type: 'image', src: 'img/daily-2026-10-15-4.jpg', seconds: 7 }],
      ticker: 'Vietnam Digital Awards 2026: Hệ thống Quản lý vùng phủ mạng vô tuyến của Viettel Networks được vinh danh' }
  ],

  // ---- Lịch cho 2 khung bên phải: Hôm nay, Sắp diễn ra (mã QR gửi tin nằm cuối dòng chạy) ----
  //   from, to (tuỳ chọn): 'YYYY-MM-DD' · time, place: tuỳ chọn
  //   Có to  = một giai đoạn: hiện ở "Hôm nay" suốt thời gian diễn ra.
  //   Không to = sự kiện một ngày: hiện ở "Hôm nay" đúng ngày đó.
  //   "Sắp diễn ra" = 4 mục gần nhất chưa tới. Mục đã qua tự ẩn.
  AGENDA: [
    { title: 'Giải thể thao tháng 10', from: '2026-10-06', to: '2026-10-23', place: '5 bộ môn' },
    { title: 'Cầu lông · Thi đấu', from: '2026-10-10', time: 'Chiều Thứ Bảy' },
    { title: 'Bida · Vòng 1 và tứ kết', from: '2026-10-09', time: 'Tối' },
    { title: 'Bida · Bán kết, chung kết', from: '2026-10-14', time: 'Tối' },
    { title: 'Bóng bàn · Vòng bảng', from: '2026-10-06', to: '2026-10-09' },
    { title: 'Bóng bàn · Tứ kết', from: '2026-10-13', to: '2026-10-14' },
    { title: 'Bóng bàn · Bán kết', from: '2026-10-16', to: '2026-10-19' },
    { title: 'Bóng đá · Vòng bảng', from: '2026-10-15', time: '19:15', place: 'Sân bóng Đình Thôn 2' },
    { title: 'Bóng bàn · Tranh hạng Ba', from: '2026-10-22' },
    { title: 'Bóng đá · Tranh hạng Ba', from: '2026-10-23', time: '16:15', place: 'Sân bóng Đình Thôn 2' },
    { title: 'Bóng đá · Chung kết', from: '2026-10-23', time: '16:15', place: 'Sân bóng Đình Thôn 2' },
    { title: 'Bóng bàn · Chung kết', from: '2026-10-23' },
    { title: 'Lễ trao giải thể thao', from: '2026-10-23', time: '17:30', place: 'Sân bóng Đình Thôn 2' },
    { title: 'Tiệc giao lưu', from: '2026-10-23', time: '18:00', place: 'Quán bia Thu Hằng, 18 Lê Đức Thọ' }
  ],

  // Mục thêm tay cho khung "Hôm nay". Khai from/to để tự hiện, tự ẩn theo ngày; không khai thì hiện mãi.
  TODAY: [
  ],

  // Châm ngôn: khung "Hôm nay" chạy ngẫu nhiên các câu khi hôm nay không có lịch, QUOTE_SECONDS giây đổi một câu.
  //   QUOTES_SHEET: link CSV của Google Sheet công khai, 3 cột: STT (hoặc Ngày dd/mm/yyyy) | Câu | Tác giả.
  //   Dòng có ngày trùng hôm nay thì chỉ chạy các dòng đó; không thì chạy ngẫu nhiên cả Sheet, không lặp tới khi hết lượt.
  //   Sửa Sheet không cần commit, TV đọc lại mỗi 30 phút. QUOTES là câu dự phòng khi không đọc được Sheet.
  QUOTE_SECONDS: 60,
  QUOTES_SHEET: 'https://docs.google.com/spreadsheets/d/1PzfHgcaG-5M64DdpggJS3xcZLNBnRbCPNlFx_7Ck7bU/gviz/tq?tqx=out:csv&gid=0',
  QUOTES: [
    { text: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', by: 'Ca dao Việt Nam' },
    { text: 'Có công mài sắt, có ngày nên kim.', by: 'Tục ngữ Việt Nam' },
    { text: 'Đi một ngày đàng, học một sàng khôn.', by: 'Tục ngữ Việt Nam' }
  ],

  // Câu thêm vào dòng chạy. Chuỗi, hoặc { text, until: 'YYYY-MM-DD' } để tự ẩn sau ngày đó.
  TICKER: [
    { text: 'Bóng đá · 16:15 Thứ Sáu 23/10, Sân bóng Đình Thôn 2, hai trận song song · Tranh hạng Ba: P.NTCN gặp Liên quân P.HTC & P.TNTT · Chung kết: Liên quân P.GPBRCĐ&CĐ – P.HTTK – P.KSCL gặp Liên quân P.GPDĐ & P.GPCNTT&QT', until: '2026-10-23' },
    { text: 'Liên hoan kết thúc thành công tối Thứ Sáu 23/10 · Gắn kết, Bứt phá, Thi đấu hết mình', until: '2026-10-23' },
    { text: 'Đám cưới Phương Nam & Việt Hà · 08:30 Thứ Tư 28/10 tại Xóm Lưu Sơn 1, Xã Đô Lương, Nghệ An · Xe xuất phát 04:00 sáng Thứ Tư 28/10 tại Epic Tower, 19 Duy Tân (có mặt 03:30)', until: '2026-10-28' }
  ],

  // Ảnh phủ kín màn hình (backdrop sự kiện), che toàn bộ bản tin trong khoảng from đến until rồi tự ẩn.
  //   from, until: 'YYYY-MM-DDTHH:MM' giờ Việt Nam. Không cần thì để null.
  //   src: một ảnh hoặc mảng ảnh (chuyển lần lượt, mỗi ảnh seconds giây, mặc định 7).
  BACKDROP: { src: ['img/backdrop-2026-10-21.jpg?v=5', 'img/backdrop-2026-10-21-2.jpg'], seconds: 7, from: '2026-10-21T08:15', until: '2026-10-21T10:20' },

  // Mã tin phòng ban (news/) không chiếu lên TV, ví dụ tin đã gộp vào một tin trong STORIES.
  HIDE_NEWS: ['T261019-SBN7', 'T261027-WSVU'],

  // Video dài hơn chừng này giây thì chuyển tiếp
  VIDEO_MAX_SECONDS: 90
};
