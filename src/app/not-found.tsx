import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Không tìm thấy trang</h1>
      <p className="mt-2 text-slate-600">
        Đề thi có thể chưa phát hành hoặc đường dẫn không đúng.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/" variant="secondary">
          Trang chủ
        </ButtonLink>
        <ButtonLink href="/de-thi" variant="primary">
          Danh sách đề
        </ButtonLink>
      </div>
    </div>
  );
}