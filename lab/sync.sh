#!/bin/sh
# Giữ thư mục SITE_DIR luôn bằng bản mới nhất của repo trên Gogs.
# Cứ INTERVAL giây hỏi Gogs một lần, có commit mới thì cập nhật file tại chỗ.
# Chạy trong container alpine/git (xem docker-compose.yml, k8s.yaml).

: "${REPO_URL:?Thiếu REPO_URL, ví dụ http://<máy-gogs>:4001/minhnn23/cloud-tv.git}"
BRANCH=${BRANCH:-main}
INTERVAL=${INTERVAL:-60}
SITE_DIR=${SITE_DIR:-/site}

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }

cd "$SITE_DIR" || { log "Không vào được $SITE_DIR"; exit 1; }
git config --global --add safe.directory "$SITE_DIR" 2>/dev/null || true

[ -d .git ] || git init -q .
git config core.logAllRefUpdates false          # không giữ lịch sử cũ, đỡ tốn đĩa
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"

log "Đồng bộ $REPO_URL (nhánh $BRANCH) vào $SITE_DIR, $INTERVAL giây một lần"
while :; do
  if git fetch -q --depth 1 origin "$BRANCH" 2>/tmp/fetch.err; then
    new=$(git rev-parse FETCH_HEAD)
    if [ "$new" != "$(git rev-parse -q --verify HEAD)" ]; then
      if git reset -q --hard FETCH_HEAD; then
        log "Đã cập nhật lên $(git log -1 --format='%h %s')"
        git gc -q --auto 2>/dev/null
      else
        log "Lỗi khi cập nhật file, thử lại sau"
      fi
    fi
  else
    log "Chưa lấy được repo: $(tr '\n' ' ' </tmp/fetch.err)"
  fi
  sleep "$INTERVAL"
done
