import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const canonical = siteUrl();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vaijob Exam — Luyện đề miễn phí",
    template: "%s | Vaijob Exam",
  },
  description:
    "Luyện thi trực tuyến miễn phí qua cổng truy cập. Chọn đề, làm bài có giờ, xem kết quả và ôn lại câu sai.",
  metadataBase: new URL(canonical),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Vaijob Exam",
    url: canonical,
    title: "Vaijob Exam — Luyện đề miễn phí",
    description:
      "50 đề IOE Tiếng Anh lớp 7 và đề mẫu. Làm bài có giờ, chấm điểm tức thì.",
  },
  twitter: {
    card: "summary",
    title: "Vaijob Exam — Luyện đề miễn phí",
  },
  alternates: { canonical },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-slate-50 pb-[4.75rem] text-slate-900 antialiased`}
      >
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white py-5 text-center text-sm text-slate-500 shadow-[0_-1px_3px_rgba(15,23,42,0.06)]">
          Vaijob Exam — Miễn phí cho học sinh
        </footer>
      </body>
    </html>
  );
}