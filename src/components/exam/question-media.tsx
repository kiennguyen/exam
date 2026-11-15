import type { PublicQuestion } from "@/lib/exam/types";

/** Audio / ảnh minh họa (làm bài & xem lại). */
export function QuestionMedia({ question }: { question: PublicQuestion }) {
  const needsAudio = question.metadata?.requiresAudio === true;
  const needsImage = question.metadata?.requiresImage === true;
  if (!needsAudio && !needsImage && !question.media?.url) return null;

  return (
    <div className="mt-3 space-y-2">
      {question.media?.type === "audio" && question.media.url && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">Nghe và chọn đáp án</p>
          <audio controls preload="none" className="w-full max-w-md" src={question.media.url}>
            Trình duyệt không hỗ trợ phát audio.
          </audio>
        </div>
      )}
      {needsAudio && !question.media?.url && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Câu nghe: bản web chưa gắn file audio. Bạn vẫn chọn đáp án theo đề; nếu cần nghe file
          gốc, dùng tài liệu Word IOE trên máy tính.
        </p>
      )}
      {needsImage && !question.media?.url && (
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
          Câu có hình: ảnh minh họa chưa được gắn trên web. Đọc mô tả trong đề hoặc xem file gốc.
        </p>
      )}
      {question.media?.type === "image" && question.media.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.media.url}
          alt={question.media.alt ?? "Minh họa câu hỏi"}
          className="max-h-64 w-full rounded-xl border border-slate-200 object-contain"
        />
      )}
    </div>
  );
}