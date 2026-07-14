import { Skeleton } from 'antd';
import { IconGlyph } from '@/src/shared/components/IconGlyph';
import type { SessionSummary } from '@/src/shared/types/kiosk';

interface StatusPanelProps {
  loading: boolean;
  currentSession: SessionSummary | null;
  hasSessionToday: boolean;
}

export function StatusPanel({
  loading,
  currentSession,
  hasSessionToday,
}: StatusPanelProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-4">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Ca học hiện tại
          </p>
          {currentSession && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />{' '}
              ĐANG MỞ
            </span>
          )}
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} className="mt-4" />
        ) : currentSession ? (
          <>
            <h2 className="m-0 mt-4 line-clamp-2 text-[20px] font-bold leading-7 tracking-[-0.02em] text-slate-950">
              {currentSession.subjectName}
            </h2>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <IconGlyph className="text-blue-600">◷</IconGlyph>{' '}
              {formatTime(currentSession.checkinOpenAt)} –{' '}
              {formatTime(currentSession.checkinCloseAt)}
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
            {hasSessionToday
              ? 'Hiện chưa có phiên điểm danh nào đang mở.'
              : 'Phòng học không có lịch điểm danh hôm nay.'}
          </div>
        )}
      </section>
    </aside>
  );
}

function formatTime(isoString: string) {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}
