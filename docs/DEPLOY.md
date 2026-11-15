# Triển khai `exam.vaijob.com` trên Vercel

Hướng dẫn chính thức: **hosting Vercel** (gói Hobby/free đủ MVP) + **DNS trên Cloudflare** (domain bạn đang quản lý ở đó).

## Tổng quan

| Thành phần | Ghi chú |
|------------|---------|
| App | Next.js 15, ~**4,3 MB** JSON đề trong `data/` (commit cùng repo) |
| Cổng truy cập | `/truy-cap` — họ tên, lớp, **mã người giới thiệu** (học sinh tự nhập; kiểm tra server) |
| Gói Vercel free | Đủ traffic lớp học vừa; xem [pricing](https://vercel.com/pricing) nếu dùng thương mại quy mô lớn |
| DNS | Cloudflare → CNAME trỏ sang Vercel (không bắt buộc host app trên Cloudflare) |

Alternative: [DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md) (Workers/OpenNext) — không dùng trong flow này.

---

## 0. Chuẩn bị trước khi deploy

Trên máy local (thư mục `exam`):

```bash
npm ci
npm run validate:exams
npm run typecheck
npm run lint
npm run build
```

Đảm bảo **`main` trên GitHub** đã chứa mọi thay đổi cần production (cổng truy cập, thời lượng 30 phút, v.v.).

Tạo sẵn secret cookie (lưu vào password manager):

```bash
# PowerShell — chuỗi ngẫu nhiên 32 ký tự
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Hoặc dùng mật khẩu dài ≥ **16 ký tự** (không commit).

---

## 1. Tạo project trên Vercel (khuyến nghị)

1. Đăng nhập [vercel.com](https://vercel.com) (cùng tài khoản GitHub nếu có thể).
2. **Add New → Project** → import repo **`vaijob/exam`** (hoặc fork/clone đúng repo của bạn).
3. **Root Directory:** để **`.`** (repo chỉ có app exam).
4. **Framework Preset:** Next.js (tự nhận).
5. **Build & Development Settings** (hoặc đọc từ `vercel.json`):
   - **Build Command:** `npm run validate:exams && npm run build`
   - **Install Command:** `npm install` (hoặc `npm ci` nếu Vercel hỗ trợ chọn)
   - **Output Directory:** (để trống — Next mặc định)
6. **Node.js Version:** **20.x** (Project → Settings → General).

### Biến môi trường (bắt buộc cho production)

Trong **Project → Settings → Environment Variables**, thêm cho môi trường **Production** (và Preview nếu muốn test):

| Biến | Bắt buộc | Giá trị ví dụ |
|------|----------|----------------|
| `ACCESS_COOKIE_SECRET` | **Có** | Chuỗi bí mật ≥ 16 ký tự (mục 0) |
| `NEXT_PUBLIC_SITE_URL` | **Nên có** | `https://exam.vaijob.com` |

Sau khi thêm `NEXT_PUBLIC_SITE_URL`, **Redeploy** để sitemap/OG dùng URL đúng.

7. **Deploy** lần đầu → mở URL `https://<project>.vercel.app`.

---

## 2. Gắn domain `exam.vaijob.com`

### Trên Vercel

1. **Project → Settings → Domains**
2. Thêm `exam.vaijob.com` (và tùy chọn redirect `www` nếu cần).
3. Vercel hiển thị **bản ghi DNS cần tạo** (thường là CNAME).

### Trên Cloudflare (DNS zone `vaijob.com`)

1. **DNS → Records → Add record**
2. **Type:** `CNAME`
3. **Name:** `exam`
4. **Target:** giá trị Vercel chỉ định (ví dụ `cname.vercel-dns.com` hoặc `xxxx.vercel-dns-xxx.com`)
5. **Proxy status:** bật proxy (đám mây cam) — thường vẫn chạy ổn với Vercel.

**SSL/TLS (Cloudflare):** chế độ **Full** hoặc **Full (strict)** (Vercel cấp HTTPS cho origin).

Đợi vài phút → Vercel báo domain **Valid**.

---

## 3. Kiểm tra sau deploy

Checklist nhanh trên `https://exam.vaijob.com`:

- [ ] Vào `/` → redirect **`/truy-cap`**
- [ ] Nhập họ tên, lớp, đúng mã người giới thiệu → vào trang chủ
- [ ] `/de-thi` — thời lượng đề IOE hiển thị **30 phút** (không còn ~80 phút)
- [ ] Mở `ioe-de-01` → **Bắt đầu làm bài** → nộp được, xem `/ket-qua`
- [ ] `/cai-dat` (menu **Kết quả**) — danh sách kết quả local
- [ ] `https://exam.vaijob.com/robots.txt` và `sitemap.xml` truy cập được

Cookie truy cập: **HttpOnly**, **Secure** trên HTTPS, thời hạn ~30 ngày.

---

## 4. CI trên GitHub

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): mỗi push/PR lên `main` chạy `validate:exams`, `typecheck`, `lint`, `build`.

Nên bật **branch protection** → required check **CI** trước khi merge.

---

## 5. Deploy tự động qua GitHub Actions (tùy chọn)

Nếu **không** bật Git integration của Vercel, dùng [`.github/workflows/deploy-vercel.yml`](../.github/workflows/deploy-vercel.yml).

**Repository → Settings → Secrets and variables → Actions:**

| Secret | Lấy ở đâu |
|--------|-----------|
| `VERCEL_TOKEN` | Vercel → Account Settings → [Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Chạy `npx vercel link` trong repo, hoặc Team/Project API |
| `VERCEL_PROJECT_ID` | Project → Settings → General |

Workflow deploy khi push `main` (bỏ qua commit chỉ sửa `*.md` hoặc `docs/**`).

**Khuyến nghị:** Chỉ cần **Import GitHub project trên Vercel** — Vercel tự deploy mỗi push `main`, không bắt buộc workflow.

---

## 6. Cập nhật đề sau khi đã live

1. Sửa / rebuild JSON trong `data/exams/` (xem [IMPORT-IOE.md](./IMPORT-IOE.md)).
2. `npm run validate:exams` local.
3. Commit + push `main` → Vercel build lại.

`version` trong mỗi file exam đổi khi build IOE — phiên làm bài cũ trên thiết bị có thể bị báo đổi phiên bản đề; học sinh làm lại đề mới.

---

## 7. Media IOE (ảnh / audio)

**Audio (đã hỗ trợ):**

```bash
npm run ioe:audio-all
npm run validate:exams
```

Mp3 nằm tại `public/ioe-media/audio/` (có thể commit — đã bỏ gitignore thư mục này). JSON đề có `question.media.url` dạng `/ioe-media/audio/...`.

**Ảnh:** `npm run ioe:images-all` (parse + copy từ Word → `public/ioe-media/images/`).

Tổng: `npm run ioe:media-all` (audio + ảnh). Sau đó `validate:exams` và commit JSON + `public/ioe-media/`.

---

## 8. Xử lý sự cố

| Triệu chứng | Hướng xử lý |
|-------------|-------------|
| Vòng lặp `/truy-cap` | Kiểm tra `ACCESS_COOKIE_SECRET` đã set Production; cookie bị chặn (Safari ITP / extension) |
| Domain “Invalid Configuration” | So lại CNAME Cloudflare với domain Vercel; tắt proxy thử rồi bật lại |
| Build fail `validate:exams` | Sửa JSON đề local, push lại |
| 401 khi làm bài | Chưa qua `/truy-cap` hoặc cookie hết hạn |
| Thời lượng cũ trên local | Dev từng cache JSON — production đọc file mới; học sinh: làm phiên mới hoặc xóa kết quả tại `/cai-dat` |

---

## 9. Tham chiếu file

- [`vercel.json`](../vercel.json) — build command
- Cổng truy cập: `src/middleware.ts`, `src/app/truy-cap/`
- Mã giới thiệu cố định: `src/lib/access/constants.ts` → `REFERRER_REQUIRED`