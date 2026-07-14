'use client';

import { App, Button, Tooltip, Modal } from 'antd';
import { useRouter } from '@/src/shared/hooks/useRouter';
import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { IconGlyph } from '@/src/shared/components/IconGlyph';
import { useClock } from '@/src/shared/hooks/useClock';
import { getApiErrorMessage } from '@/src/shared/lib/api-client';
import {
  clearDeviceSession,
  getKioskInfo,
  isActivated,
} from '@/src/shared/lib/device-storage';
import { useBackendHealth } from '@/src/features/activation/hooks/useBackendHealth';
import { checkInAttendance } from '../api/attendance.api';
import { useFaceLiveness } from '../hooks/useFaceLiveness';
import { useTodaySessions } from '../hooks/useTodaySessions';
import { dataUrlToJpeg } from '../lib/image';
import { CameraPanel } from './CameraPanel';
import { CheckInResult, type ResultState } from './CheckInResult';

export function AttendanceScreen() {
  const router = useRouter();
  const { modal } = App.useApp();
  const webcamRef = useRef<Webcam>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const lastCaptureRef = useRef(0);
  const online = useBackendHealth();
  const clock = useClock();
  const kioskInfo = getKioskInfo();
  const sessions = useTodaySessions();

  const showWifiLost = !online;

  const face = useFaceLiveness(
    webcamRef,
    cameraReady &&
      Boolean(sessions.data?.canCheckIn) &&
      !sending &&
      !result &&
      !showWifiLost,
  );

  useEffect(() => {
    if (!isActivated()) router.replace('/');
  }, [router]);

  useEffect(() => {
    if (!sessions.data?.canCheckIn) {
      setCameraReady(false);
    }
  }, [sessions.data?.canCheckIn]);

  const submitCheckIn = useCallback(async () => {
    if (
      sending ||
      result ||
      !sessions.data?.canCheckIn ||
      face.phase !== 'ready'
    )
      return;
    if (Date.now() - lastCaptureRef.current < 5_000) return;

    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) return;

    lastCaptureRef.current = Date.now();
    setSending(true);
    try {
      const captureId = crypto.randomUUID();
      const response = await checkInAttendance({
        file: await dataUrlToJpeg(screenshot),
        captureId,
        capturedAt: new Date().toISOString(),
        liveness: face.liveness,
        faceQuality: face.quality,
      });
      setResult({
        type: 'success',
        message: response.message,
        data: response.data,
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: getApiErrorMessage(
          error,
          'Không thể gửi ảnh điểm danh. Vui lòng thử lại.',
        ),
      });
    } finally {
      setSending(false);
      window.setTimeout(() => {
        setResult(null);
        face.reset();
      }, 3_500);
    }
  }, [face, result, sending, sessions.data?.canCheckIn]);

  useEffect(() => {
    if (face.phase === 'ready') void submitCheckIn();
  }, [face.phase, submitCheckIn]);

  function deactivate() {
    modal.confirm({
      title: 'Hủy kích hoạt thiết bị?',
      content: 'Kiosk sẽ quay về màn hình nhập OTP và cần kích hoạt lại.',
      okText: 'Hủy kích hoạt',
      cancelText: 'Giữ nguyên',
      okButtonProps: { danger: true },
      onOk: () => {
        clearDeviceSession();
        router.replace('/');
      },
    });
  }

  const roomCode =
    sessions.data?.kiosk.roomCode ??
    kioskInfo?.room.room_code ??
    'Chưa xác định';
  const deviceName =
    sessions.data?.kiosk.deviceName ??
    kioskInfo?.device_name ??
    'Kiosk điểm danh';

  return (
    <main className="kiosk-shell flex min-h-svh flex-col p-3 sm:p-4 lg:p-5">
      <header className="mb-3 flex items-center justify-between rounded-[20px] border border-white bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="min-w-0">
            <p className="m-0 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {deviceName}
            </p>
            <p className="m-0 mt-0.5 flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="text-slate-500">Phòng</span> {roomCode}
            </p>
          </div>
        </div>

        {sessions.data?.currentSession ? (
          <div className="mx-4 hidden flex-1 items-center gap-3 justify-center md:flex">
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-1.5 shadow-xs">
              <div className="min-w-0 max-w-[180px] lg:max-w-[280px]">
                <p
                  className="m-0 truncate text-[12px] font-bold text-slate-800"
                  title={sessions.data.currentSession.subjectName}
                >
                  {sessions.data.currentSession.subjectName}
                </p>
                <p className="m-0 text-[12px] font-semibold text-slate-500 leading-normal">
                  {formatTime(sessions.data.currentSession.checkinOpenAt)} –{' '}
                  {formatTime(sessions.data.currentSession.checkinCloseAt)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-4 hidden flex-1 justify-center md:flex">
            <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
              {sessions.data?.hasSessionToday
                ? 'Chờ phiên điểm danh tiếp theo'
                : 'Không có lịch điểm danh hôm nay'}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4">
          <div
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold lg:flex ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
          >
            <IconGlyph>{online ? '●' : '×'}</IconGlyph>
            {online ? 'Đã kết nối' : 'Mất kết nối'}
          </div>
          <div className="text-right">
            <p className="m-0 text-lg font-bold leading-none text-slate-950 sm:text-xl">
              {clock.time}
            </p>
            <p className="m-0 mt-1 hidden text-[10px] capitalize text-slate-500 sm:block">
              {clock.date}
            </p>
          </div>
          <Tooltip title="Tải lại dữ liệu">
            <Button
              aria-label="Tải lại dữ liệu"
              type="text"
              shape="circle"
              icon={<IconGlyph>↻</IconGlyph>}
              loading={sessions.loading}
              onClick={() => void sessions.refresh()}
            />
          </Tooltip>
          <Tooltip title="Hủy kích hoạt">
            <Button
              aria-label="Hủy kích hoạt thiết bị"
              type="text"
              danger
              shape="circle"
              icon={<IconGlyph>↪</IconGlyph>}
              onClick={deactivate}
            />
          </Tooltip>
        </div>
      </header>

      {online === false && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-center text-xs font-semibold text-white">
          <IconGlyph>×</IconGlyph> Mất kết nối máy chủ — kiosk sẽ tự động thử
          kết nối lại.
        </div>
      )}

      <div className="attendance-grid grid min-h-0 flex-1">
        <div className="relative min-h-0 flex flex-col">
          <CameraPanel
            key={cameraKey}
            ref={webcamRef}
            cameraReady={cameraReady}
            cameraError={cameraError}
            phase={face.phase}
            instruction={face.instruction}
            canCheckIn={Boolean(sessions.data?.canCheckIn) && !showWifiLost}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError(null);
            }}
            onCameraError={(error) => {
              setCameraReady(false);
              setCameraError(
                error instanceof DOMException &&
                  error.name === 'NotAllowedError'
                  ? 'Quyền truy cập camera đang bị từ chối. Hãy cấp quyền camera trong cài đặt trình duyệt kiosk.'
                  : 'Không tìm thấy camera hoặc camera đang được ứng dụng khác sử dụng.',
              );
            }}
            onRetryCamera={() => {
              setCameraError(null);
              setCameraReady(false);
              setCameraKey((value) => value + 1);
            }}
          />
          <CheckInResult result={result} />
        </div>
      </div>

      <footer className="mt-3 flex items-center justify-between rounded-2xl border border-white bg-white/80 px-4 py-2.5 text-[11px] text-slate-500 shadow-sm">
        <span className="flex items-center gap-2">
          <IconGlyph className="text-blue-600">▦</IconGlyph>{' '}
          {sessions.data?.sessions.length ?? 0} ca học trong hôm nay
        </span>
        <span className="hidden sm:inline">
          Đứng cách camera khoảng 0,5–1 mét và nhìn thẳng.
        </span>
        <span className="font-semibold text-slate-600">Tự động điểm danh</span>
      </footer>

      <Modal
        open={!online}
        className="wifi-lost-modal"
        footer={null}
        closable={false}
        centered
        keyboard={false}
        maskClosable={false}
        width={420}
        styles={{
          mask: {
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          },
          body: {
            padding: 0,
          },
        }}
      >
        <div className="flex flex-col items-center text-center p-8 bg-white/95 rounded-3xl border border-white/80 shadow-2xl">
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50/80 p-4 ring-8 ring-red-50/40">
            <img
              src="/wifi.png"
              alt="Mất kết nối Wifi"
              className="h-16 w-16 object-contain animate-pulse"
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md border-2 border-white">
              <IconGlyph>×</IconGlyph>
            </span>
          </div>
          <h3 className="m-0 text-xl font-extrabold text-slate-900 tracking-tight">
            Mất kết nối Wifi / Internet
          </h3>
          <p className="m-0 mt-3 text-sm leading-relaxed text-slate-500">
            Kiosk đã bị mất kết nối mạng. Vui lòng kiểm tra lại thiết bị phát
            Wifi hoặc đường truyền mạng trên thiết bị.
          </p>
          <div className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-50 border border-slate-100/80 px-4 py-3.5 text-xs font-bold text-slate-600 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            Đang tự động thử kết nối lại...
          </div>
        </div>
      </Modal>
    </main>
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
