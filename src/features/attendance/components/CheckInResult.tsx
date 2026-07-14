import type { CheckInData } from "@/src/shared/types/kiosk";
import { IconGlyph } from "@/src/shared/components/IconGlyph";

export type ResultState =
  | { type: "success"; message: string; data: CheckInData }
  | { type: "error"; message: string }
  | null;

export function CheckInResult({ result }: { result: ResultState }) {
  if (!result) return null;

  const success = result.type === "success";
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/65 p-6 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-[26px] bg-white p-7 text-center shadow-2xl">
        <div className={`mx-auto grid size-16 place-items-center rounded-full text-3xl ${success ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}>
          {success ? <IconGlyph>✓</IconGlyph> : <IconGlyph>×</IconGlyph>}
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-950">{success ? "Điểm danh thành công" : "Chưa thể điểm danh"}</h2>
        {success && (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="m-0 text-base font-bold text-slate-900">{result.data.student.fullName}</p>
            <p className="m-0 mt-1 text-sm font-medium text-slate-500">{result.data.student.studentCode}</p>
          </div>
        )}
        <p className={`m-0 mt-4 text-sm leading-6 ${success ? "text-emerald-700" : "text-red-700"}`}>{result.message}</p>
        <p className="m-0 mt-3 text-xs text-slate-400">Màn hình sẽ tự động sẵn sàng cho sinh viên tiếp theo.</p>
      </div>
    </div>
  );
}
