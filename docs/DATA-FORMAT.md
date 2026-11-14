# Định dạng dữ liệu đề (schema v1)

Schema version hiện tại: `1` (trường `schemaVersion` trên mỗi file).

## Vị trí file

```
data/
  collections/{slug}.json     # ExamCollection
  exams/{collection-slug}/{exam-slug}.json   # Exam
```

## ExamCollection

| Trường | Mô tả |
|--------|--------|
| `id` | ID nội bộ duy nhất |
| `slug` | URL, ví dụ `ioe-grade-7` |
| `title`, `description` | Hiển thị trên web |
| `subject`, `grade`, `examType` | Lọc danh sách đề |
| `academicYear` | Năm học hoặc `null` |
| `language` | Mã ngôn ngữ UI nội dung (`vi`) |
| `status` | `draft` \| `published` |
| `examIds` | Danh sách `id` của các file Exam |

## Exam

| Trường | Mô tả |
|--------|--------|
| `collectionId` | Khớp `id` của collection |
| `slug` | URL đề, ví dụ `practice-01` |
| `instructions` | Hướng dẫn trước khi thi |
| `durationSeconds` | Thời lượng (giây) |
| `totalPoints` | Tổng điểm (= tổng `points` các câu) |
| `version` | Phiên bản nội dung (lưu kèm kết quả) |
| `sections` | Nhóm câu |
| `questions` | Mảng câu hỏi |
| `status` | `draft` \| `published` |

## Question

Loại hỗ trợ MVP:

- `single_choice` — `correctAnswer` là một `option.id`
- `multiple_choice` — `correctAnswer` là mảng `option.id`; chấm đúng khi khớp **toàn bộ**
- `fill_blank` — `correctAnswer` là chuỗi (hoặc mảng chuỗi đồng nghĩa); chấm không phân biệt hoa thường, trim khoảng trắng
- `word_order` — prompt chứa các mảnh từ phân tách bằng `/`; học sinh gõ câu hoàn chỉnh; chấm giống `fill_blank`

Trường tùy chọn: `explanation`, `media`, `metadata`.

## Quy trình thêm đề mới

1. Tạo file JSON trong `data/exams/{collection-slug}/`.
2. Thêm `exam.id` vào `examIds` của collection.
3. Chạy `npm run validate:exams` — sửa lỗi cho đến khi pass.
4. Đặt `status: "published"` khi sẵn sàng hiển thị.
5. Commit chỉ khi bạn có quyền sử dụng nội dung đề.

## Nhập 50 đề IOE lớp 7 (sau khi có quyền)

- Chuẩn hóa mỗi đề thành một file JSON theo schema trên.
- Đặt slug `practice-01` … `practice-50` (hoặc quy ước thống nhất).
- **Không** commit đề có bản quyền vào repo public khi chưa được phép.
- Có thể giữ đề thật ở thư mục riêng (`.gitignore`) và copy vào `data/` khi build nội bộ.

Ví đề mẫu: `data/exams/ioe-grade-7/demo-nhanh.json`.