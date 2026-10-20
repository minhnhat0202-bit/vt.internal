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
    { id: 'phu-nu-20-10', tab: 'Ngày Phụ nữ Việt Nam', title: 'CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10',
      image: 'img/daily-2026-10-19.jpg?v=2', until: '2026-10-20',
      ticker: 'Chúc mừng Ngày Phụ nữ Việt Nam 20/10 · Yêu thương & Tôn vinh' },

    // Một tab gộp kết quả mọi giải đã xong. Môn mới có kết quả: thêm một dòng vào slides.
    { id: 'ket-qua', tab: 'Kết quả giải đấu', title: 'Kết quả giải đấu', tag: 'Chung cuộc', slideSeconds: 20,
      slides: [
        { src: 'img/ket-qua-cau-long.jpg?v=2', sub: 'Cầu lông · Vô địch: Hiếu – Thảo' },
        { src: 'img/ket-qua-pes.jpg', sub: 'PES · Vô địch: Hiếu & Trung' },
        { src: 'img/ket-qua-bida.jpg', sub: 'Bida · Vô địch: Lê Văn Thành & Trần Phan Huy Anh' }
      ],
      ticker: ['Vô địch Cầu lông: Hiếu – Thảo', 'Vô địch PES: Hiếu & Trung',
        'Kết quả Bida · Nhất: Lê Văn Thành & Trần Phan Huy Anh · Nhì: Lê Ngọc Thái & Phạm Gia Khiêm · Ba: Nguyễn Nhật Minh & Lê Quốc Đạt · Tư: Nguyễn Xuân Huy & Lê Hải Sơn'] },

    { id: 'vda-2026', tab: 'Giải thưởng CĐS 2026', title: 'Giải thưởng Chuyển đổi số Việt Nam 2026', tag: 'Vinh danh',
      sub: 'Hệ thống Quản lý vùng phủ mạng vô tuyến · Viettel Networks',
      items: [{ type: 'video', src: 'media/daily-2026-10-14.mp4' }, { type: 'image', src: 'img/daily-2026-10-14.jpg', seconds: 10 },
        { type: 'image', src: 'img/daily-2026-10-15-1.jpg', seconds: 7 }, { type: 'image', src: 'img/daily-2026-10-15-2.jpg', seconds: 7 },
        { type: 'image', src: 'img/daily-2026-10-15-3.jpg', seconds: 7 }, { type: 'image', src: 'img/daily-2026-10-15-4.jpg', seconds: 7 }],
      ticker: 'Vietnam Digital Awards 2026: Hệ thống Quản lý vùng phủ mạng vô tuyến của Viettel Networks được vinh danh' },

    { id: 'new-member', tab: 'Thành viên mới', title: 'Chào mừng thành viên mới gia nhập Trung tâm', tag: 'Gia nhập 16/10/2026',
      slideSeconds: 8,
      slides: [{ src: 'img/01-nghiem-xuan-son.png' }, { src: 'img/02-dam-ngoc-khanh.png' }, { src: 'img/03-tong-tran-minh-duc.png' }],
      ticker: 'Chào mừng 3 thành viên mới gia nhập Trung tâm: Nghiêm Xuân Sơn, Đàm Ngọc Khánh, Tống Trần Minh Đức' }
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
    { title: 'Bóng đá · Tranh hạng Ba', from: '2026-10-22', time: '19:15', place: 'Sân bóng Đình Thôn 2' },
    { title: 'Bóng bàn · Tranh hạng Ba', from: '2026-10-22' },
    { title: 'Bóng đá · Chung kết', from: '2026-10-23', time: '16:15', place: 'Sân bóng Đình Thôn 2' },
    { title: 'Bóng bàn · Chung kết', from: '2026-10-23' },
    { title: 'Liên hoan kết thúc thành công', from: '2026-10-23', time: 'Tối', place: 'Toàn Trung tâm' }
  ],

  // Mục thêm tay cho khung "Hôm nay". Khai from/to để tự hiện, tự ẩn theo ngày; không khai thì hiện mãi.
  TODAY: [
  ],

  // Câu thêm vào dòng chạy. Chuỗi, hoặc { text, until: 'YYYY-MM-DD' } để tự ẩn sau ngày đó.
  TICKER: [
    { text: 'Bóng đá · Bảng A: Phòng Nền tảng Công nghệ; Liên quân P. Giải pháp băng rộng cố định và Cơ điện, P. Hợp tác triển khai và P. Kiểm soát chất lượng · Bảng B: Liên quân P. Giải pháp di động và P. Giải pháp CNTT và Quy trình; Liên quân P. Hạ tầng Cloud và P. Trí tuệ nhân tạo', until: '2026-10-23' },
    { text: 'Liên hoan kết thúc thành công tối Thứ Sáu 23/10 · Gắn kết, Bứt phá, Thi đấu hết mình', until: '2026-10-23' }
  ],

  // Ảnh phủ kín màn hình (backdrop sự kiện), che toàn bộ bản tin trong khoảng from đến until rồi tự ẩn.
  //   from, until: 'YYYY-MM-DDTHH:MM' giờ Việt Nam. Không cần thì để null.
  BACKDROP: { src: 'img/backdrop-2026-10-20.jpg', from: '2026-10-20T08:00', until: '2026-10-20T10:45' },

  // Video dài hơn chừng này giây thì chuyển tiếp
  VIDEO_MAX_SECONDS: 90
};
