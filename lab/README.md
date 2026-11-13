# Triển khai Bản tin TV trong lab

Dành cho quản trị hạ tầng lab. Việc cần làm: phát một trang web tĩnh (Bản tin TV của Trung tâm) từ repo `minhnn23/cloud-tv` trên Gogs của lab, để màn hình TV mở `http://<máy-chạy>:<cổng>/tv/`.

Trang không có backend, không cần build. Gói này gồm hai container dùng image có sẵn:

| Container | Image | Việc |
|---|---|---|
| `sync` | `alpine/git` | Kéo repo từ Gogs về một volume, 60 giây hỏi lại một lần ([sync.sh](sync.sh)) |
| `web` | `nginx:stable-alpine` | Phát volume đó ở cổng 80 ([nginx.conf](nginx.conf)) |

## Điều kiện

- Máy chạy tới được Gogs qua HTTP. Repo đang để công khai trong Gogs nên không cần tài khoản để kéo.
- Kéo được hai image trên (từ Docker Hub hoặc registry nội bộ; nếu dùng registry nội bộ thì sửa tên image trong file).
- Khoảng 150 MB đĩa. Máy chủ **không cần ra Internet**; chỉ trình duyệt trên TV gọi Google (tin phòng ban, ảnh Drive, nhạc).
- Mạng của TV vào được cổng phát trang.

## Cách 1: Docker Compose

```sh
git clone --depth 1 http://<máy-gogs>:4001/minhnn23/cloud-tv.git
cd cloud-tv/lab
REPO_URL=http://<máy-gogs>:4001/minhnn23/cloud-tv.git docker compose up -d
```

Mặc định phát ở cổng 8080. Đổi cổng: thêm `WEB_PORT=<cổng>` trước lệnh, hoặc ghi cả hai biến vào file `lab/.env`.

## Cách 2: Kubernetes

```sh
cd cloud-tv/lab
kubectl create configmap cloud-tv-conf --from-file=nginx.conf --from-file=sync.sh
# sửa REPO_URL trong k8s.yaml thành địa chỉ repo trên Gogs, rồi:
kubectl apply -f k8s.yaml
```

Service kiểu NodePort, cổng 30080. Muốn dùng Ingress thì trỏ vào Service `cloud-tv` cổng 80.

## Kiểm tra

```sh
curl -I http://<máy-chạy>:<cổng>/tv/          # mong đợi: HTTP 200
docker compose logs sync                       # hoặc: kubectl logs deploy/cloud-tv -c sync
```

Log của `sync` ghi `Đã cập nhật lên <mã commit> <nội dung>` mỗi lần có bản mới. Nếu ghi `Chưa lấy được repo` thì máy chưa tới được Gogs hoặc repo chưa có nhánh `main`.

## Vận hành

- **Cập nhật nội dung là tự động.** Ban Truyền thông push lên Gogs, trong 60 giây server có bản mới, TV tự tải lại trong khoảng 2 phút. Không cần khởi động lại container.
- **Không sửa file trực tiếp trên server.** Lần cập nhật kế tiếp sẽ ghi đè.
- Đổi `nginx.conf` hoặc `sync.sh`: Compose chạy lại `docker compose up -d --force-recreate`; Kubernetes tạo lại ConfigMap rồi `kubectl rollout restart deploy/cloud-tv`.
- Gỡ: `docker compose down -v` hoặc `kubectl delete -f k8s.yaml && kubectl delete configmap cloud-tv-conf`.

## Biến của container `sync`

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `REPO_URL` | bắt buộc | Địa chỉ clone HTTP của repo trên Gogs |
| `BRANCH` | `main` | Nhánh được phát |
| `INTERVAL` | `60` | Số giây giữa hai lần hỏi Gogs |

## HTTP hay HTTPS

Trang chạy được trên HTTP. Khác biệt duy nhất so với HTTPS: trình phát nhạc giải lao không lưu được file nhạc qua các lần tải lại trang (trình duyệt chỉ cho dùng Cache Storage trên HTTPS), nên sau mỗi lần tải lại TV phải tải lại các bài, mỗi bài 15 đến 45 giây. Nếu lab có tên miền nội bộ kèm chứng chỉ, nên đặt reverse proxy HTTPS phía trước cổng này.

## Trạng thái kiểm thử

`sync.sh` đã chạy thử với repo giả (repo trống, có commit mới, xoá file, ghi đè lịch sử). Hai file YAML và `nginx.conf` mới kiểm tra cú pháp, **chưa chạy trong Docker hay Kubernetes thật**; lần triển khai đầu là lần thử đầu tiên.
