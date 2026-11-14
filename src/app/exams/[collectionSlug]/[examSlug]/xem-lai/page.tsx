import type { Metadata } from "next";
import { ExamReviewLoader } from "@/components/exam/exam-review-loader";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ collectionSlug: string; examSlug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function ExamReviewPage({ params, searchParams }: Props) {
  const { collectionSlug, examSlug } = await params;
  const { session: sessionId } = await searchParams;

  return (
    <ExamReviewLoader
      collectionSlug={collectionSlug}
      examSlug={examSlug}
      sessionId={sessionId}
    />
  );
}