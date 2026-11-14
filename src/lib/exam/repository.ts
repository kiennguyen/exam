import fs from "fs/promises";
import path from "path";
import type { Exam, ExamCollection, PublicExam } from "./types";
import { collectionSchema, examSchema } from "./schema";

const DATA_ROOT = path.join(process.cwd(), "data");

const cacheJsonInProd = process.env.NODE_ENV === "production";

export class ExamRepository {
  private collectionsCache: ExamCollection[] | null = null;
  private examsCache: Map<string, Exam> | null = null;

  private async readJson<T>(filePath: string): Promise<T> {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  }

  async loadAllCollections(): Promise<ExamCollection[]> {
    if (cacheJsonInProd && this.collectionsCache) return this.collectionsCache;

    const dir = path.join(DATA_ROOT, "collections");
    const files = await fs.readdir(dir);
    const collections: ExamCollection[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await this.readJson<unknown>(path.join(dir, file));
      collections.push(collectionSchema.parse(data));
    }

    collections.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    if (cacheJsonInProd) this.collectionsCache = collections;
    return collections;
  }

  async loadAllExams(): Promise<Map<string, Exam>> {
    if (cacheJsonInProd && this.examsCache) return this.examsCache;

    const map = new Map<string, Exam>();
    const examsDir = path.join(DATA_ROOT, "exams");
    const collectionDirs = await fs.readdir(examsDir);

    for (const colDir of collectionDirs) {
      const fullColDir = path.join(examsDir, colDir);
      const stat = await fs.stat(fullColDir);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(fullColDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const data = await this.readJson<unknown>(path.join(fullColDir, file));
        const exam = examSchema.parse(data) as Exam;
        map.set(exam.id, exam);
      }
    }

    if (cacheJsonInProd) this.examsCache = map;
    return map;
  }

  async getCollectionBySlug(slug: string): Promise<ExamCollection | null> {
    const collections = await this.loadAllCollections();
    return collections.find((c) => c.slug === slug) ?? null;
  }

  async getExamBySlug(
    collectionSlug: string,
    examSlug: string
  ): Promise<Exam | null> {
    const collection = await this.getCollectionBySlug(collectionSlug);
    if (!collection) return null;

    const exams = await this.loadAllExams();
    for (const examId of collection.examIds) {
      const exam = exams.get(examId);
      if (exam && exam.slug === examSlug && exam.collectionId === collection.id) {
        return exam;
      }
    }
    return null;
  }

  async listPublishedExams(): Promise<
    Array<{
      collection: ExamCollection;
      exam: Exam;
    }>
  > {
    const collections = await this.loadAllCollections();
    const exams = await this.loadAllExams();
    const items: Array<{ collection: ExamCollection; exam: Exam }> = [];

    for (const collection of collections) {
      if (collection.status !== "published") continue;
      for (const examId of collection.examIds) {
        const exam = exams.get(examId);
        if (!exam || exam.status !== "published") continue;
        items.push({ collection, exam });
      }
    }

    const sortKey = (slug: string): number => {
      const m = slug.match(/ioe-de-(\d+)/);
      if (m) return Number(m[1]);
      if (slug === "demo-nhanh") return -2;
      if (slug.startsWith("practice-")) return -1;
      return 10_000;
    };
    items.sort(
      (a, b) =>
        sortKey(a.exam.slug) - sortKey(b.exam.slug) ||
        a.exam.title.localeCompare(b.exam.title, "vi")
    );
    return items;
  }
}

export function toPublicExam(exam: Exam): PublicExam {
  return {
    id: exam.id,
    collectionId: exam.collectionId,
    slug: exam.slug,
    title: exam.title,
    instructions: exam.instructions,
    durationSeconds: exam.durationSeconds,
    totalPoints: exam.totalPoints,
    version: exam.version,
    sections: exam.sections,
    questions: exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      order: q.order,
      options: q.options,
      media: q.media,
      metadata: q.metadata,
    })),
  };
}

let singleton: ExamRepository | null = null;

export function getExamRepository(): ExamRepository {
  if (!singleton) singleton = new ExamRepository();
  return singleton;
}