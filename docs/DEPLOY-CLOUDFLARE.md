# Triển khai `exam.vaijob.com` trên Cloudflare (Workers)

> **Lưu ý:** Hướng dẫn deploy **mặc định** của dự án là **[DEPLOY.md](./DEPLOY.md)** (Vercel + DNS Cloudflare). Tài liệu này chỉ dùng khi bạn muốn **chạy app trên Cloudflare Workers**, không phải chỉ quản lý DNS.

App là **Next.js 15** (middleware, API Route, đọc JSON từ `data/`). Không thể chỉ upload static — cần **runtime Node/Workers** tương thích Next.

## Chạy local trước khi deploy

```bash
cd exam
npm install
npm run validate:exams   # nên chạy một lần
npm run dev              # mặc định http://localhost:3020 (tránh trùng port 3000)
```

Kiểm tra:

1. `http://localhost:3020/` → redirect `/truy-cap`
2. Nhập họ tên, lớp, mã người giới thiệu → vào trang chủ
3. `/de-thi` → mở một đề → làm bài → nộp bài

Giả lập production trên máy:

```bash
npm run build
npm run start -- -p 3020
```

## Biến môi trường (production)

| Biến | Bắt buộc | Ghi chú |
|------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Có | `https://exam.vaijob.com` |
| `ACCESS_COOKIE_SECRET` | Có | Chuỗi ngẫu nhiên ≥ 16 ký tự (ký cookie `/truy-cap`) |
| `NODE_VERSION` | Nên | `20` (nếu CI/build image hỏi) |

Đặt trong **Cloudflare Workers/Pages → Settings → Variables**.

## Hướng triển khai khuyến nghị: OpenNext + Workers

Cloudflare hỗ trợ Next qua [**OpenNext** adapter](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`):

1. Cài adapter + Wrangler (một lần khi bạn sẵn sàng deploy):

   ```bash
   npm install -D @opennextjs/cloudflare wrangler
   ```

2. Thêm cấu hình `open-next.config.ts`, `wrangler.toml` theo tài liệu OpenNext (phiên bản khớp Next **15.5.x**).

3. Build (gợi ý):

   ```bash
   npm run validate:exams
   npx opennextjs-cloudflare build
   ```

4. Deploy:

   ```bash
   npx wrangler deploy
   ```

   Hoặc nối repo GitHub với **Workers Builds** (build command ở trên).

Repo **chưa** gắn sẵn Wrangler/OpenNext — tránh phình dependency trước khi bạn chốt Cloudflare. Khi deploy, có thể nhờ thêm file cấu hình vào repo.

### Lưu ý kỹ thuật

- Thư mục `data/exams` và `data/collections` phải có trong artifact deploy (OpenNext thường bundle cùng server).
- Middleware Edge đã dùng Web Crypto → tương thích Workers.
- Script IOE (`import:ioe`, `ioe:build`) **chỉ chạy trên máy dev/CI**, không chạy trên Cloudflare lúc runtime.

## DNS `exam.vaijob.com`

Trong **Cloudflare DNS** (zone `vaijob.com`):

- `exam` → `CNAME` tới hostname Workers/Pages do Wrangler cung cấp  
  hoặc bật **Custom Domain** trong project Cloudflare.

Bật **Proxy** (đám mây cam) nếu zone đã dùng Cloudflare.

## So với Vercel

- `docs/DEPLOY.md` — workflow Vercel (đã có `vercel.json`).
- Production target của bạn là **Cloudflare** → ưu tiên tài liệu file này.

## Checklist trước go-live

- [ ] `ACCESS_COOKIE_SECRET` production
- [ ] `NEXT_PUBLIC_SITE_URL=https://exam.vaijob.com`
- [ ] `npm run validate:exams && npm run build` pass trên CI
- [ ] Thử `/truy-cap` và làm 1 đề demo trên domain thật
- [ ] Cookie `Secure` trên HTTPS (tự bật khi `NODE_ENV=production`)