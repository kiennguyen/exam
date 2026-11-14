import type { Metadata } from "next";
import { ExamListClient, type ExamListItem } from "@/components/exam/exam-list-client";
import { getExamRepository } from "@/lib/exam/repository";

export const metadata: Metadata = {
  title: "Danh sách đề thi",
  description:
    "Tìm và lọc đề luyện thi theo môn học, khối lớp và loại đề. Vaijob Exam — miễn phí, không đăng nhập.",
};

export default async function ExamListPage() {
  const repo = getExamRepository();
  const published = await repo.listPublishedExams();

  const items: ExamListItem[] = published.map(({ collection, exam }) => ({
    collectionSlug: collection.slug,
    collectionTitle: collection.title,
    subject: collection.subject,
    grade: collection.grade,
    examType: collection.examType,
    examSlug: exam.slug,
    examTitle: exam.title,
    questionCount: exam.questions.length,
    durationSeconds: exam.durationSeconds,
    totalPoints: exam.totalPoints,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Danh sách đề</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Lọc theo môn, khối lớp hoặc loại đề. Chọn một đề để xem hướng dẫn trước khi
        bắt đầu làm bài.
      </p>
      <div className="mt-8">
        <ExamListClient items={items} />
      </div>
    </div>
  );
}