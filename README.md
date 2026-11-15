# Vaijob Exam (`vaijob-exam`)

Website luyện đề miễn phí tại [exam.vaijob.com](https://exam.vaijob.com) — cổng `/truy-cap` (họ tên, lớp, mã giới thiệu), làm bài có giờ, chấm server-side, xem lại câu sai.

**Nội dung:** Repo có **50 đề IOE lớp 7** (`ioe-de-01`…`ioe-de-50`, ~190 câu/đề, **30 phút**/đề) build từ nguồn nội bộ + file đáp án; thêm 3 đề mẫu hệ thống. File Word/đáp án gốc nằm ngoài git (`data/imported/`). Chỉ công khai/tái phân phối khi đủ quyền pháp lý.

## Yêu cầu

- Node.js 20+
- npm

## Chạy local

```bash
cd exam
npm install
npm run dev
```

Mở [http://localhost:3020](http://localhost:3020) (port mặc định; nếu bận, Next tự chọn port khác — xem log terminal).

## Lệnh hữu ích

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run validate:exams` | Kiểm tra toàn bộ JSON đề |
| `npm run import:ioe` | Parse file Word IOE → `data/imported/` (gitignore) |
| `npm run import:report` | Thống kê sau import |
| `npm run ioe:template` | CSV/JSON mẫu đáp án |
| `npm run ioe:answers-from-csv` | CSV → `*.answers.json` |
| `npm run ioe:parse-answers` | Parse file đáp án Word → JSON |
| `npm run ioe:audit-gaps` | Liệt kê câu thiếu đáp án (JSON + docx) |
| `npm run ioe:build` | Import + đáp án → `data/exams/` |
| `npm run ioe:publish-all` | Parse + build 50 đề + sync + validate |
| `npm run ioe:extract-media` | Trích ảnh từ file đề Word |
| `npm run ioe:parse-audio` | Map URL audio từ Word → `audio-map.json` |
| `npm run ioe:download-audio` | Tải mp3 về `public/ioe-media/audio/` |
| `npm run ioe:apply-audio` | Gắn `question.media` vào JSON đề |
| `npm run ioe:audio-all` | Parse + tải + gắn (một lệnh) |
| `npm run ioe:media-report` | Thống kê câu cần ảnh/audio trong đề build |
| `npm run ioe:sync-collection` | Cập nhật `examIds` collection |

## Cấu trúc thư mục

```
data/                    # Nội dung đề (JSON)
docs/DATA-FORMAT.md      # Schema và quy trình nhập đề
scripts/validate-exams.ts
src/
  app/                   # Trang & API routes (Next.js App Router)
  components/            # UI
  lib/exam/              # Schema, validate, repository, chấm điểm
  lib/session/           # localStorage (phiên thi & kết quả)
```

## Thêm bộ đề / đề mới

Xem [docs/DATA-FORMAT.md](docs/DATA-FORMAT.md). Tóm tắt:

1. Thêm file exam dưới `data/exams/{collection-slug}/`.
2. Cập nhật `data/collections/{slug}.json` → `examIds`.
3. `npm run validate:exams` rồi `status: "published"`.

## Lưu kết quả trên thiết bị

- Truy cập: nhập họ tên + lớp tại `/truy-cap` (cookie 30 ngày trên domain).
- Câu trả lời, giờ, đánh dấu câu, kết quả gần đây → **localStorage**.
- Không đồng bộ đám mây giữa các máy.
- Trang **Kết quả** (`/cai-dat`) — xem / **Xóa kết quả** local.

## Chấm điểm & bảo mật đáp án

- Client nhận đề qua API **không có** `correctAnswer` / `explanation`.
- Nộp bài: `POST /api/exams/submit` — chấm trên server.
- Kết quả lưu kèm `examVersion` để đối chiếu khi đề được sửa sau.

## Triển khai (Vercel + DNS Cloudflare)

**Hướng dẫn đầy đủ:** [docs/DEPLOY.md](docs/DEPLOY.md)

Tóm tắt:

1. Import repo `vaijob/exam` trên [Vercel](https://vercel.com) (Hobby/free đủ; ~4 MB data JSON trong repo).
2. Env **Production:** `ACCESS_COOKIE_SECRET` (≥16 ký tự), `NEXT_PUBLIC_SITE_URL=https://exam.vaijob.com`
3. Cloudflare DNS: **CNAME** `exam` → target Vercel chỉ định.
4. Push `main` → Vercel tự build (`validate:exams` + `next build`).

Local production check: `npm run build && npm run start -- -p 3020`

## Nhập 50 đề IOE (Word)

Xem [docs/IMPORT-IOE.md](docs/IMPORT-IOE.md). Tóm tắt: `npm run import:ioe` → chỉnh đáp án & chuyển sang `data/exams/` → `validate:exams`.

## CI & triển khai

- GitHub Actions: `.github/workflows/ci.yml` (validate, typecheck, lint, build)
- Vercel: `vercel.json` — hướng dẫn [docs/DEPLOY.md](docs/DEPLOY.md), domain `exam.vaijob.com`

## TODO mở rộng

- [x] 50 đề IOE: media local (ảnh 414/414; audio ~952/1000) — `npm run ioe:media-all`
- [ ] Đăng nhập tùy chọn & đồng bộ đám mây
- [x] Điền khuyết (`fill_blank`) — còn ghép cặp, nghe
- [ ] Chuyển import JSON → Exam tự động (phần đã có đáp án)
- [ ] i18n đa ngôn ngữ giao diện

## Giấy phép

Xem [LICENSE](LICENSE).