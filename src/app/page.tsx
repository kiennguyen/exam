import { ButtonLink } from "@/components/ui/button";
import { getExamRepository } from "@/lib/exam/repository";
import { formatDuration } from "@/lib/format";
import Link from "next/link";

export default async function HomePage() {
  const repo = getExamRepository();
  const items = await repo.listPublishedExams();
  const demo = items.find(({ exam }) => exam.slug === "demo-nhanh");
  const ioe = items.filter(({ exam }) => exam.slug.startsWith("ioe-de-"));
  const featured = [...(demo ? [demo] : []), ...ioe.slice(0, 7)].slice(0, 8);

  return (
    <div>
      <section className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 px-6 py-12 text-white shadow-lg sm:px-10 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-200">
          Miễn phí · Truy cập qua người giới thiệu
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Vaijob Exam
        </h1>
        <p className="mt-4 max-w-xl text-lg text-teal-50/95 leading-relaxed">
          Nơi học sinh luyện đề có bấm giờ, nộp bài và xem ngay câu sai để ôn lại.
          50 đề IOE Tiếng Anh lớp 7 — trắc nghiệm, điền khuyết và sắp xếp từ, khoảng
          190+ câu mỗi đề.
        </p>
        <div className="mt-8">
          <ButtonLink href="/de-thi" variant="inverse">
            Bắt đầu luyện tập
          </ButtonLink>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-slate-900">Cách sử dụng</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Chọn đề phù hợp"],
            ["2", "Làm bài trong thời gian quy định"],
            ["3", "Xem kết quả và câu sai"],
            ["4", "Làm lại để luyện tập"],
          ].map(([n, t]) => (
            <li
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-800">
                {n}
              </span>
              <p className="mt-2 font-medium text-slate-800">{t}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">Đề nổi bật</h2>
          <Link href="/de-thi" className="text-sm font-semibold text-teal-700 hover:underline">
            Xem tất cả
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-4 text-slate-600">Chưa có đề phát hành.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {featured.map(({ collection, exam }) => (
              <li
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold text-teal-700">
                  {collection.subject} · {collection.grade}
                </p>
                <h3 className="mt-1 font-semibold text-slate-900">
                  <Link
                    href={`/exams/${collection.slug}/${exam.slug}`}
                    className="hover:text-teal-700"
                  >
                    {exam.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {exam.questions.length} câu · {formatDuration(exam.durationSeconds)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <p>
          <strong className="text-slate-800">Lưu ý:</strong> Một số câu nghe/ảnh
          chưa gắn file trên web. Tiến độ làm bài lưu trên thiết bị (localStorage),
          không đồng bộ giữa các máy. Chỉ sử dụng và chia sẻ nội dung IOE khi bạn có
          quyền hợp pháp với nguồn đề.
        </p>
      </section>
    </div>
  );
}