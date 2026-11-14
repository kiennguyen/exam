import { DeviceProgressClient } from "@/components/exam/device-progress-client";

export const metadata = {
  title: "Kết quả",
  description: "Xem kết quả làm bài gần đây trên trình duyệt này.",
};

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Kết quả</h1>
      <div className="mt-8">
        <DeviceProgressClient />
      </div>
    </div>
  );
}