import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessProfile } from "@/lib/access/require";
import { getExamRepository } from "@/lib/exam/repository";
import { gradeExam } from "@/lib/exam/scoring";
import type { SubmitPayload } from "@/lib/exam/types";

const submitSchema = z.object({
  collectionSlug: z.string().min(1),
  examSlug: z.string().min(1),
  sessionId: z.string().min(1),
  examVersion: z.string().min(1),
  startedAt: z.number().int().positive(),
  submittedAt: z.number().int().positive(),
  answers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), z.null()])
  ),
  flagged: z.array(z.string()),
  autoSubmitted: z.boolean().optional(),
});

export async function POST(request: Request) {
  const access = await getAccessProfile();
  if (!access) {
    return NextResponse.json({ error: "Chưa xác thực truy cập." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const payload = parsed.data as SubmitPayload;
  const repo = getExamRepository();
  const exam = await repo.getExamBySlug(payload.collectionSlug, payload.examSlug);

  if (!exam || exam.status !== "published") {
    return NextResponse.json({ error: "Đề không tồn tại" }, { status: 404 });
  }

  if (exam.version !== payload.examVersion) {
    return NextResponse.json(
      {
        error:
          "Phiên bản đề đã thay đổi. Vui lòng làm lại đề mới để đảm bảo chấm điểm chính xác.",
      },
      { status: 409 }
    );
  }

  const result = gradeExam(exam, payload);
  return NextResponse.json({ result });
}