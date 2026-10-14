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
    if kind: rows.append({'id': fid, 'name': name, 'type': kind})

# ---- Video: iPhone quay HEVC (.MOV) mà trình duyệt thường không phát được, nên chuyển sang H.264 MP4 720p
# bằng ffmpeg (có sẵn trên GitHub Actions) và lưu vào media/<id>.mp4. Máy không có ffmpeg thì bỏ qua bước này,
# trang sẽ thử phát thẳng từ Drive.
import shutil, subprocess, tempfile, os
media_dir = root / 'media'; media_dir.mkdir(exist_ok=True)
have_ffmpeg = shutil.which('ffmpeg') is not None
want = {r['id'] for r in rows if r['type'] == 'video'}
for r in rows:
    if r['type'] != 'video': continue
    out = media_dir / (r['id'] + '.mp4')
    if not out.exists() and have_ffmpeg:
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, 'src.bin')
            dl = subprocess.run(['curl', '-sL', '--max-time', '600', '-o', src,
                                 f'https://drive.google.com/uc?export=download&confirm=t&id={r["id"]}'])
            ok = dl.returncode == 0 and os.path.getsize(src) > 10000
            if ok:
                ff = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
                                     '-vf', "scale='min(1280,iw)':-2", '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
                                     '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', str(out)])
                ok = ff.returncode == 0 and out.exists()
            print(('Đã chuyển mã ' if ok else 'Không chuyển mã được ') + r['name'])
    if out.exists(): r['src'] = 'media/' + out.name
for f in media_dir.glob('*.mp4'):   # dọn video đã xóa khỏi Drive
    if f.stem not in want: f.unlink(); print('Đã xóa', f.name)

def js_row(r):
    extra = f", src: {json.dumps(r['src'])}" if r.get('src') else ''
    return "  { id: %s, name: %s, type: '%s'%s }" % (json.dumps(r['id']), json.dumps(r['name'], ensure_ascii=False), r['type'], extra)
(root / 'media.json').write_text(json.dumps(rows, ensure_ascii=False, indent=0) + "\n", encoding='utf-8')
(root / 'media.js').write_text("// Danh sách ảnh, video cho khung Tin tiêu điểm. Sinh tự động từ thư mục Google Drive công khai\n// bằng tools/drive-media.py; có thể sửa tay: xóa dòng để ẩn, đảo thứ tự để đổi lượt chiếu.\nwindow.DRIVE_MEDIA = [\n" + ",\n".join(js_row(r) for r in rows) + "\n];\n", encoding='utf-8')
nvid = sum(r['type'] == 'video' for r in rows); nsrc = sum(1 for r in rows if r.get('src'))
print(f'Đã ghi media.js và media.json: {len(rows)} mục ({nvid} video, {nsrc} đã chuyển mã) từ {len(ents)} file.' + ('' if have_ffmpeg else ' Máy này không có ffmpeg nên chưa chuyển mã video.'))
