import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { ExamTakeClient } from "@/components/exam/exam-take-client";
import { getExamRepository, toPublicExam } from "@/lib/exam/repository";
import { parseDurationParam } from "@/lib/session/duration-preference";

interface Props {
  params: Promise<{ collectionSlug: string; examSlug: string }>;
  searchParams: Promise<{ session?: string; duration?: string }>;
}

export default async function ExamTakePage({ params, searchParams }: Props) {
  const { collectionSlug, examSlug } = await params;
  const { session: resumeSessionId, duration: durationParam } = await searchParams;
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

  const publicExam = toPublicExam(exam);
  const durationSecondsOverride = parseDurationParam(
    durationParam,
    publicExam.durationSeconds
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Làm bài: {exam.title}</h1>
      <ExamTakeClient
        collectionSlug={collectionSlug}
        examSlug={examSlug}
        initialExam={publicExam}
        resumeSessionId={resumeSessionId}
        durationSecondsOverride={durationSecondsOverride}
      />
    </div>
  );
}