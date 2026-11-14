import type { MetadataRoute } from "next";
import { getExamRepository } from "@/lib/exam/repository";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const repo = getExamRepository();
  const published = await repo.listPublishedExams();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/de-thi`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/cai-dat`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const examRoutes: MetadataRoute.Sitemap = published.map(({ collection, exam }) => ({
    url: `${base}/exams/${collection.slug}/${exam.slug}`,
    changeFrequency: "monthly" as const,
    priority: exam.slug.startsWith("ioe-de-") ? 0.7 : 0.5,
  }));

  return [...staticRoutes, ...examRoutes];
}