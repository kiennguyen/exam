import { z } from "zod";
import { SCHEMA_VERSION } from "./types";

const questionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["single_choice", "multiple_choice", "fill_blank", "word_order"]),
  prompt: z.string().min(1),
  points: z.number().nonnegative(),
  order: z.number().int().nonnegative(),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  explanation: z.string().optional(),
  media: z
    .object({
      type: z.enum(["image", "audio"]),
      url: z.string().min(1),
      alt: z.string().optional(),
    })
    .optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  questionIds: z.array(z.string().min(1)),
});

export const examSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  collectionId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  totalPoints: z.number().positive(),
  version: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
  questions: z.array(questionSchema).min(1),
  status: z.enum(["draft", "published"]),
});

export const collectionSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  examType: z.string().min(1),
  academicYear: z.string().nullable(),
  language: z.string().min(1),
  status: z.enum(["draft", "published"]),
  examIds: z.array(z.string().min(1)),
});

export type ExamInput = z.infer<typeof examSchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;