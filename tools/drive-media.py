#!/usr/bin/env python3
"""Sinh media.js và media.json từ một thư mục Google Drive công khai (Anyone with the link).

Cách dùng:  python3 tools/drive-media.py [FOLDER_ID]
Mặc định dùng FOLDER_ID trong index.html (hằng DRIVE_FOLDER_ID). Chạy xong commit media.js và push.
"""
import html, json, re, sys, urllib.request, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
folder = sys.argv[1] if len(sys.argv) > 1 else re.search(r"DRIVE_FOLDER_ID = '([^']+)'", (root / 'index.html').read_text(encoding='utf-8')).group(1)
url = f'https://drive.google.com/embeddedfolderview?id={folder}#list'
def fetch(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
    except Exception as e:  # Python trên macOS thiếu chứng chỉ gốc: thử certifi, rồi curl
        try:
            import ssl, certifi
            return urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context(cafile=certifi.where())).read().decode('utf-8', 'ignore')
        except Exception:
            import subprocess
            r = subprocess.run(['curl', '-sL', '--max-time', '30', '-A', 'Mozilla/5.0', u], capture_output=True)
            if r.returncode != 0 or not r.stdout:
                raise e
            return r.stdout.decode('utf-8', 'ignore')
page = fetch(url)
ents = re.findall(r'<div class="flip-entry" id="entry-([^"]+)".*?flip-entry-title">(.*?)</div>', page, re.S)
if not ents:
    sys.exit('Không đọc được thư mục. Kiểm tra thư mục đã bật chia sẻ "Bất kỳ ai có liên kết".')
IMG = ('jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'); VID = ('mov', 'mp4', 'm4v', 'webm')
rows = []
for fid, name in ents:
    name = html.unescape(name); ext = name.rsplit('.', 1)[-1].lower()
    kind = 'image' if ext in IMG else 'video' if ext in VID else None
    if kind: rows.append((fid, name, kind))
body = ",\n".join("  { id: %s, name: %s, type: '%s' }" % (json.dumps(f), json.dumps(n, ensure_ascii=False), k) for f, n, k in rows)
(root / 'media.json').write_text(json.dumps([{'id': f, 'name': n, 'type': k} for f, n, k in rows], ensure_ascii=False, indent=0) + "\n", encoding='utf-8')
(root / 'media.js').write_text("// Danh sách ảnh, video cho khung Tin tiêu điểm. Sinh tự động từ thư mục Google Drive công khai\n// bằng tools/drive-media.py; có thể sửa tay: xóa dòng để ẩn, đảo thứ tự để đổi lượt chiếu.\nwindow.DRIVE_MEDIA = [\n" + body + "\n];\n", encoding='utf-8')
print(f'Đã ghi media.js và media.json: {len(rows)} mục ({sum(k=="video" for _,_,k in rows)} video) từ {len(ents)} file.')
