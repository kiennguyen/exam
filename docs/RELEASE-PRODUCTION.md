# Đưa bản có media lên `exam.vaijob.com`

Repo làm việc hàng ngày: **`kiennguyen/exam`** (`origin`).

Project Vercel hiện có thể vẫn gắn **`vaijob/exam`** branch `main` (code khác lịch sử git → push `main` không tự cập nhật production).

## Cách A — Đổi repo trên Vercel (khuyến nghị)

1. Vercel → project exam → **Settings → Git**
2. **Disconnect** → **Connect** repo **`kiennguyen/exam`**
3. Production Branch: **`main`**
4. Đợi deploy xong → kiểm tra:
   - `https://exam.vaijob.com/api/health`
   - `https://exam.vaijob.com/ioe-media/audio/635302352490500592_Audio.mp3` (HTTP 200)

## Cách B — Branch trên `vaijob/exam` (đã có sẵn)

Đã push nhánh **`release/exam-media`** lên `vaijob/exam` (cùng nội dung `kiennguyen/exam` @ `main`).

1. Vercel → **Settings → Git** — giữ repo `vaijob/exam`
2. **Settings → Environments → Production** → **Production Branch** = `release/exam-media`
3. **Redeploy**

Cập nhật nhánh sau này (từ máy local, sau khi push `origin main`):

```bash
git push https://github.com/vaijob/exam.git main:release/exam-media
```

*(Không merge vào `main` của `vaijob/exam` — hai repo không chung git history.)*

## Xác nhận

| Kiểm tra | OK khi |
|----------|--------|
| `/api/health` | `{"ok":true,"mediaStatic":true,"commit":"…"}` |
| `/ioe-media/...mp3` | Status **200**, không redirect `/truy-cap` |
| Làm đề 01 | Có nút audio + ảnh trên câu tương ứng |