// =====================================================================
// NỘI DUNG BẢN TIN TV · trang tv/index.html
// Việc hằng ngày (thêm tin, đổi lịch, đổi dòng chạy) CHỈ sửa file này, không cần đụng tv/index.html.
// Đường dẫn ảnh, video viết tính từ gốc repo: 'img/...', 'media/...' (trang tự thêm ../).
// Sửa xong: commit + push, TV tự tải lại trong khoảng 2 phút.
// =====================================================================
window.TV = {

  // Thời lượng mặc định mỗi tin (giây), khi tin không khai seconds.
  STORY_SECONDS: 60,

  // ---- Tin tiêu điểm: thứ tự mảng = thứ tự chiếu. Mỗi tin là một ô trên thanh story. ----
  //   id, tab (tên ngắn trên thanh story), title (tiêu đề), tag (nhãn vàng, tuỳ chọn), sub (dòng phụ, tuỳ chọn)
  //   seconds: thời lượng riêng · ticker: câu (hoặc mảng câu) thêm vào dòng chạy
  //   until: 'YYYY-MM-DD' = tự ẩn tin sau ngày này (tuỳ chọn)
  // Chọn MỘT kiểu nội dung:
  //   source: 'drive'   ảnh, video từ Google Drive (media.js) có bộ đếm; intro = thẻ mở đầu kèm pháo hoa;
  //                     photoSeconds = giây mỗi ảnh; shuffle = chiếu ngẫu nhiên không lặp
  //   slides: [{ src, sub? }], slideSeconds   chiếu lần lượt nhiều ảnh, có bộ đếm n / tổng.
  //                     sub của từng ảnh thay dòng phụ khi ảnh đó hiện. Không khai seconds thì thời lượng
  //                     tin = số ảnh × slideSeconds.
  //   items: [{ type: 'video', src }, { type: 'image', src, seconds? }]   video phát hết thì sang mục kế
  //   image: 'img/...'  một poster tĩnh
  STORIES: [
    { id: 'dam-cuoi-nam-ha', tab: 'Sự kiện hot', title: 'Đám cưới Phương Nam & Việt Hà', until: '2026-10-28',
      image: 'img/daily-2026-10-26.jpg?v=2',
      ticker: 'Đám cưới Phương Nam & Việt Hà · 08:30 Thứ Tư 28/10 tại Xóm Lưu Sơn 1, Xã Đô Lương, Nghệ An · Xe xuất phát 14:30 Thứ Ba 27/10 tại Epic Tower, 19 Duy Tân' },

    { id: 'phu-nu-20-10', tab: 'Ngày Phụ nữ Việt Nam', title: 'CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10',
      until: '2026-10-25', slideSeconds: 8,
      // Gộp cả tin P. Kiểm soát Chất lượng gửi qua news/ (ảnh 1, 2) và ảnh buổi chúc mừng 20/10 (ảnh 3 đến 10)
      slides: [{ src: 'img/daily-2026-10-19.jpg?v=2' }].concat([1, 2, 3, 4, 11, 6, 7, 8, 9, 10].map(function (n) {
        return { src: 'img/daily-2026-10-20-' + n + '.jpg' }; })),
      ticker: 'Chúc mừng Ngày Phụ nữ Việt Nam 20/10 · Yêu thương & Tôn vinh' },

    // Một tab gộp kết quả mọi giải đã xong. Môn mới có kết quả: thêm một dòng vào slides.
    { id: 'ket-qua', tab: 'Giải Thể thao tháng 10', title: 'Giải Thể thao tháng 10', slideSeconds: 20,
      slides: [
        { src: 'img/daily-2026-10-22.jpg', sub: 'Bóng đá · Chung kết & Tranh hạng Ba 16h15 Thứ Sáu 23/10 · Sân bóng Đình Thôn 2' },
        { src: 'img/ket-qua-cau-long.jpg?v=2', sub: 'Cầu lông · Vô địch: Hiếu – Thảo' },
        { src: 'img/ket-qua-pes.jpg', sub: 'PES · Vô địch: Hiếu & Trung' },
        { src: 'img/ket-qua-bida.jpg', sub: 'Bida · Vô địch: Lê Văn Thành & Trần Phan Huy Anh' }
      ],
      ticker: ['16h15 Thứ Sáu 23/10 · Chung kết Bóng đá: Liên quân P.GPBRCĐ&CĐ – P.HTTK – P.KSCL gặp Liên quân P.GPDĐ & P.GPCNTT&QT · Tranh hạng Ba: P.NTCN gặp Liên quân P.HTC & P.TNTT',
        '17h30 Lễ trao giải thể thao · 18h00 Tiệc giao lưu tại Quán bia Thu Hằng, 18 Lê Đức Thọ', 'Vô địch Cầu lông: Hiếu – Thảo', 'Vô địch PES: Hiếu & Trung',
        'Kết quả Bida · Nhất: Lê Văn Thành & Trần Phan Huy Anh · Nhì: Lê Ngọc Thái & Phạm Gia Khiêm · Ba: Nguyễn Nhật Minh & Lê Quốc Đạt · Tư: Nguyễn Xuân Huy & Lê Hải Sơn'] },

    { id: 'vda-2026', tab: 'Giải thưởng CĐS 2026', title: 'Giải thưởng Chuyển đổi số Việt Nam 2026', tag: 'Vinh danh',
      sub: 'Hệ thống Quản lý vùng phủ mạng vô tuyến · Viettel Networks',
      items: [{ type: 'video', src: 'media/daily-2026-10-14.mp4' }, { type: 'image', src: 'img/daily-2026-10-14.jpg', seconds: 10 },
        { type: 'image', src: 'img/daily-2026-10-15-1.jpg', seconds: 7 }, { type: 'image', src: 'img/daily-2026-10-15-2.jpg', seconds: 7 },
        { type: 'image', src: 'img/daily-2026-10-15-3.jpg', seconds: 7 }, { type: 'image', src: 'img/daily-2026-10-15-4.jpg', seconds: 7 }],
      ticker: 'Vietnam Digital Awards 2026: Hệ thống Quản lý vùng phủ mạng vô tuyến của Viettel Networks được vinh danh' },

    { id: 'new-member', tab: 'Thành viên mới', title: 'Chào mừng thành viên mới gia nhập Trung tâm', tag: 'Gia nhập 21/10/2026',
      slideSeconds: 8,
      slides: [{ src: 'img/daily-2026-10-21-1.jpg' }, { src: 'img/daily-2026-10-21-2.jpg' }],
      ticker: 'Chào mừng 2 thành viên mới gia nhập Trung tâm: Phạm Tiến Thuận (P.NTCN), Nguyễn Đức An (P.GPCNTT&QT)' }
  ],

  // ---- Lịch cho 2 khung bên phải: Hôm nay, Sắp diễn ra (khung trên cùng là Tin các phòng, lấy từ news/) ----
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

  // Câu thêm vào dòng chạy. Chuỗi, hoặc { text, until: 'YYYY-MM-DD' } để tự ẩn sau ngày đó.
  TICKER: [
    { text: 'Bóng đá · 16:15 Thứ Sáu 23/10, Sân bóng Đình Thôn 2, hai trận song song · Tranh hạng Ba: P.NTCN gặp Liên quân P.HTC & P.TNTT · Chung kết: Liên quân P.GPBRCĐ&CĐ – P.HTTK – P.KSCL gặp Liên quân P.GPDĐ & P.GPCNTT&QT', until: '2026-10-23' },
    { text: 'Liên hoan kết thúc thành công tối Thứ Sáu 23/10 · Gắn kết, Bứt phá, Thi đấu hết mình', until: '2026-10-23' }
  ],

  // Ảnh phủ kín màn hình (backdrop sự kiện), che toàn bộ bản tin trong khoảng from đến until rồi tự ẩn.
  //   from, until: 'YYYY-MM-DDTHH:MM' giờ Việt Nam. Không cần thì để null.
  //   src: một ảnh hoặc mảng ảnh (chuyển lần lượt, mỗi ảnh seconds giây, mặc định 7).
  BACKDROP: { src: ['img/backdrop-2026-10-21.jpg?v=5', 'img/backdrop-2026-10-21-2.jpg'], seconds: 7, from: '2026-10-21T08:15', until: '2026-10-21T10:20' },

  // Mã tin phòng ban (news/) không chiếu lên TV, ví dụ tin đã gộp vào một tin trong STORIES.
  HIDE_NEWS: ['T261019-SBN7'],

  // Video dài hơn chừng này giây thì chuyển tiếp
  VIDEO_MAX_SECONDS: 90
};
