import { NextResponse } from "next/server";
import { getAccessProfile } from "@/lib/access/require";
import { getExamRepository, toPublicExam } from "@/lib/exam/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ collectionSlug: string; examSlug: string }> }
) {
  const access = await getAccessProfile();
  if (!access) {
    return NextResponse.json({ error: "Chưa xác thực truy cập." }, { status: 401 });
  }

  const { collectionSlug, examSlug } = await context.params;
  const repo = getExamRepository();
  const exam = await repo.getExamBySlug(collectionSlug, examSlug);

  if (!exam || exam.status !== "published") {
    return NextResponse.json({ error: "Đề không tồn tại hoặc chưa phát hành" }, { status: 404 });
  }

  const collection = await repo.getCollectionBySlug(collectionSlug);
  if (!collection || collection.status !== "published") {
    return NextResponse.json({ error: "Bộ đề không khả dụng" }, { status: 404 });
  }

  return NextResponse.json({
    collection: {
      slug: collection.slug,
      title: collection.title,
      subject: collection.subject,
      grade: collection.grade,
      examType: collection.examType,
    },
    exam: toPublicExam(exam),
  });
}