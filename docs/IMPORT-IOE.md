# Nhập đề từ `50 DE IOE K7.docx`

## Quyền sử dụng

Chỉ xuất bản đề lên `exam.vaijob.com` / repo public sau khi bạn **xác nhận quyền** với nguồn nội dung. Script import ghi ra `data/imported/` (đã **gitignore**).

## Bước 1 — Parse file Word

```bash
npm run import:ioe -- "C:\Users\...\Downloads\50 DE IOE K7.docx"
```

Kết quả:

- `data/imported/ioe-grade-7/de-01.import.json` … `de-50.import.json`
- `data/imported/ioe-grade-7/_import-report.json`

Mỗi file chứa:

- Trường `order` = **số in trên đề** (có thể lặp lại giữa các phần; khớp file đáp án). `sequence` = vị trí tuần tự trong Word (không trùng).
- Câu **trắc nghiệm A–D** tách được (`kind: single_choice`)
- Câu **chưa hỗ trợ** (`kind: unsupported`): điền khuyết, nghe, sắp xếp từ, v.v.

File Word **không có đáp án** — bạn phải bổ sung `correctAnswer` thủ công hoặc từ nguồn đáp án riêng.

## Bước 2 — Xem thống kê

```bash
npm run import:report
```

## Bước 3 — Parse file đáp án Word (tự động)

Nếu có file dạng `ĐÁP ÁN 7 50 ĐỀ IOE K7.docx` trong Downloads:

```bash
npm run import:ioe
npm run ioe:parse-answers
# hoặc một lệnh:
npm run ioe:publish-all
```

Script map ~7.200 đáp án vào `data/imported/ioe-grade-7/answers/de-XX.answers.json` (gitignore).

## Bước 3b — Tạo template đáp án (thủ công)

```bash
npm run ioe:template -- --exam 1
# hoặc toàn bộ 50 đề:
npm run ioe:template -- --all
```

Tạo trong `data/imported/ioe-grade-7/answers/`:

- `de-01.answers.template.csv` — mở Excel, điền cột `answer` (`a`|`b`|`c`|`d`)
- `de-01.answers.template.json` — mẫu JSON trống

Chuyển CSV đã điền:

```bash
npm run ioe:answers-from-csv -- --exam 1
```

→ `de-01.answers.json` (vẫn **gitignore** cùng thư mục `answers/`)

Định dạng JSON: [answer-key.example.json](./answer-key.example.json)

## Bước 4 — Build đề MC lên `data/exams/`

```bash
npm run ioe:build -- --exam 1
npm run ioe:sync-collection
npm run validate:exams
```

Tùy chọn:

- `--all` — build mọi đề có file answers
- `--status published` — phát hành trên web (chỉ khi đã có quyền nội dung)
- `--dry-run` — xem trước số câu
- `--mc-only` — chỉ câu trắc nghiệm A–D
- `--duration 1800` — thời lượng (giây); mặc định **30 phút** cho đề IOE (~200 câu)

File output: `data/exams/ioe-grade-7/ioe-de-01.json` (chỉ câu MC **có đáp án**).

## Bước 5 — Kiểm tra & publish

1. Rà soát nội dung / quyền sử dụng.
2. `status: "published"` trong file đề hoặc `--status published` khi build.
3. Deploy (Vercel).

## Giới hạn MVP

Ứng dụng web chỉ chấm `single_choice` và `multiple_choice`. Câu nghe/điền khuyết cần mở rộng schema + UI trước khi đưa vào production.

## Triển khai (Vercel)

Repo có `vercel.json`; build chạy `validate:exams` trước `next build`. Gắn domain `exam.vaijob.com` trong Vercel project settings.