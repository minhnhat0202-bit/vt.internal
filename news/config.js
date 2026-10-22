// =====================================================================
// CẤU HÌNH HỘP THƯ TIN CÁC PHÒNG BAN · dùng chung cho news/index.html (gửi tin),
// news/duyet.html (duyệt tin) và tv/index.html (Bản tin TV đọc tin đã duyệt).
// =====================================================================
window.VTNEWS_CONFIG = {

  // URL Web app của apps-script/news.gs (dạng https://script.google.com/macros/s/…/exec).
  // Để trống = CHẾ ĐỘ THỬ: tin, ảnh lưu trong trình duyệt đang mở, chỉ dùng để xem thử trên một máy.
  API_URL: 'https://script.google.com/macros/s/AKfycbyoUnSKvO4CDjDJ6jQX1QQT3XXjl934oC8BgldLoSXtDQIiOJp95RKup6weK96a8Br43Q/exec',

  // Danh sách đơn vị trong ô "Phòng ban", theo hệ thống đăng ký Giải thể thao (config.departments, cùng thứ tự).
  // short = tên ngắn hiện trên TV (dòng phụ, khung lịch).
  DEPARTMENTS: [
    { name: 'Ban Giám đốc', short: 'Ban Giám đốc' },
    { name: 'Phòng Giải pháp Băng rộng Cố định và Cơ điện', short: 'P.GPBRCĐ&CĐ' },
    { name: 'Phòng Giải pháp Công nghệ Thông tin và Quy trình', short: 'P.GPCNTT&QT' },
    { name: 'Phòng Giải pháp Di động', short: 'P.GPDĐ' },
    { name: 'Phòng Hạ tầng Cloud', short: 'P.HTC' },
    { name: 'Phòng Hợp tác Triển khai', short: 'P.HTTK' },
    { name: 'Phòng Kiểm soát Chất lượng', short: 'P.KSCL' },
    { name: 'Phòng Nền tảng Công nghệ', short: 'P.NTCN' },
    { name: 'Phòng Trí tuệ Nhân tạo', short: 'P.TNTT' }
  ],

  // Nhãn vàng gợi ý cho Tin tiêu điểm
  TAGS: ['Vinh danh', 'Sự kiện', 'Thông báo', 'Chúc mừng', 'Hoạt động', 'Kết quả', 'Tuyển dụng'],

  // Số ký tự tối đa, đo theo khung TV 1920×1080 (xem docs trong TRUYEN-THONG.md)
  LIMITS: { title: 60, title2: 44, tab: 22, tag: 14, sub: 70, agenda: 48, place: 40, ticker: 160 },

  DEFAULT_DAYS: 7,      // tin mặc định chiếu 7 ngày kể từ ngày bắt đầu
  MAX_IMAGES: 8,
  IMAGE_EDGE: 1600,     // ảnh được thu về cạnh dài 1600 px, JPG, ngay trên máy người gửi
  SLIDE_SECONDS: 8      // giây mỗi ảnh khi tin có nhiều ảnh
};
