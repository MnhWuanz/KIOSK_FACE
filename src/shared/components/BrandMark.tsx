import { IconGlyph } from "./IconGlyph";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-xl text-white shadow-lg shadow-blue-600/20">
        <IconGlyph>⌗</IconGlyph>
      </div>
      {!compact && (
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">STU Attendance</p>
          <p className="m-0 mt-0.5 text-[15px] font-bold text-slate-900">Kiosk điểm danh</p>
        </div>
      )}
    </div>
  );
}
