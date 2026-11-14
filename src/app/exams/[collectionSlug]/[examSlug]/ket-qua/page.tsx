import type { Metadata } from "next";
import { ExamResultClient } from "@/components/exam/exam-result-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ collectionSlug: string; examSlug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function ExamResultPage({ params, searchParams }: Props) {
  const { collectionSlug, examSlug } = await params;
  const { session: sessionId } = await searchParams;

  return (
    <ExamResultClient
      collectionSlug={collectionSlug}
      examSlug={examSlug}
      sessionId={sessionId}
    />
  );
}