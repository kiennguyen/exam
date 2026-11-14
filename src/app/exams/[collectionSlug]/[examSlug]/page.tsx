import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getExamRepository } from "@/lib/exam/repository";
import { formatDuration } from "@/lib/format";
import { ContinueExamBanner } from "@/components/exam/continue-exam-banner";

interface Props {
  params: Promise<{ collectionSlug: string; examSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collectionSlug, examSlug } = await params;
  const repo = getExamRepository();
  const exam = await repo.getExamBySlug(collectionSlug, examSlug);
  if (!exam) return { title: "Đề không tìm thấy" };
  return {
    title: exam.title,
    description: exam.instructions.slice(0, 160),
  };
}

export default async function ExamIntroPage({ params }: Props) {
  const { collectionSlug, examSlug } = await params;
  const repo = getExamRepository();
  const collection = await repo.getCollectionBySlug(collectionSlug);
  const exam = await repo.getExamBySlug(collectionSlug, examSlug);

  if (
    !collection ||
    !exam ||
    collection.status !== "published" ||
    exam.status !== "published"
  ) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-teal-700">
        {collection.subject} · {collection.grade} · {collection.examType}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{exam.title}</h1>
      <p className="mt-1 text-slate-600">{collection.title}</p>

      <ul className="mt-6 flex flex-wrap gap-4 text-sm text-slate-700">
        <li className="rounded-xl bg-white px-4 py-2 border border-slate-200">
          <span className="text-slate-500">Số câu</span>
          <p className="font-semibold">{exam.questions.length}</p>
        </li>
        <li className="rounded-xl bg-white px-4 py-2 border border-slate-200">
          <span className="text-slate-500">Thời lượng</span>
          <p className="font-semibold">{formatDuration(exam.durationSeconds)}</p>
        </li>
        <li className="rounded-xl bg-white px-4 py-2 border border-slate-200">
          <span className="text-slate-500">Tổng điểm</span>
          <p className="font-semibold">{exam.totalPoints}</p>
        </li>
      </ul>

      {exam.sections.length > 1 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Cấu trúc đề</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {[...exam.sections]
              .sort((a, b) => a.order - b.order)
              .map((sec) => (
                <li key={sec.id}>
                  {sec.title} — {sec.questionIds.length} câu
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Hướng dẫn làm bài</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-700 leading-relaxed">
          {exam.instructions}
        </p>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Thời gian sẽ được tính ngay khi bạn nhấn &quot;Bắt đầu làm bài&quot;.
        </p>
      </section>

      <ContinueExamBanner collectionSlug={collectionSlug} examSlug={examSlug} />

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink
          href={`/exams/${collectionSlug}/${examSlug}/lam-bai`}
          variant="primary"
        >
          Bắt đầu làm bài
        </ButtonLink>
        <ButtonLink href="/de-thi" variant="secondary">
          Quay lại danh sách
        </ButtonLink>
      </div>
    </div>
  );
}