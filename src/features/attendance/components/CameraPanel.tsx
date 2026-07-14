
import { Button } from "antd";
import { forwardRef } from "react";
import Webcam from "react-webcam";
import { IconGlyph } from "@/src/shared/components/IconGlyph";
import type { FacePhase } from "../hooks/useFaceLiveness";

interface CameraPanelProps {
  cameraReady: boolean;
  cameraError: string | null;
  phase: FacePhase;
  instruction: string;
  canCheckIn: boolean;
  onCameraReady: () => void;
  onCameraError: (error: string | DOMException) => void;
  onRetryCamera: () => void;
}

export const CameraPanel = forwardRef<Webcam, CameraPanelProps>(function CameraPanel(
  { cameraReady, cameraError, phase, instruction, canCheckIn, onCameraReady, onCameraError, onRetryCamera },
  ref,
) {
  const ready = phase === "ready";

  return (
    <section className="relative min-h-[430px] flex-1 overflow-hidden rounded-[24px] bg-slate-950 shadow-[0_20px_55px_rgba(15,23,42,0.24)] lg:min-h-0">
      {!cameraError && canCheckIn && (
        <Webcam
          ref={ref}
          audio={false}
          mirrored
          className="camera-video absolute inset-0"
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          forceScreenshotSourceSize
          videoConstraints={{ facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }}
          onUserMedia={onCameraReady}
          onUserMediaError={onCameraError}
        />
      )}

      {!cameraReady && !cameraError && canCheckIn && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 text-center text-white">
          <div>
            <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold">Đang khởi động camera...</p>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 p-8 text-center text-white">
          <div className="max-w-md">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-red-500/15 text-3xl text-red-300">
              <IconGlyph>×</IconGlyph>
            </div>
            <h2 className="mt-5 text-xl font-bold">Không thể sử dụng camera</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{cameraError}</p>
            <Button className="mt-5" type="primary" onClick={onRetryCamera}>Thử lại camera</Button>
          </div>
        </div>
      )}

      {!canCheckIn && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900 text-center text-white p-6">
          <div>
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-800/60 text-3xl text-slate-400 mb-4">
              <IconGlyph>📷</IconGlyph>
            </div>
            <h3 className="text-lg font-bold text-slate-200">Camera đã tắt</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto">
              Thiết bị tạm thời tắt camera khi ngoài giờ hoặc không có ca điểm danh nào mở.
            </p>
          </div>
        </div>
      )}

      {cameraReady && !cameraError && canCheckIn && (
        <>
          <div className="face-guide" data-ready={ready} aria-hidden="true">
            {phase !== "ready" && <div className="scan-line absolute left-[12%] right-[12%] top-1/2 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />}
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent px-5 pb-5 pt-20 text-white sm:px-7 sm:pb-7">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-full ${ready ? "bg-emerald-500" : "bg-white/15 backdrop-blur"}`}>
                <IconGlyph>◎</IconGlyph>
              </span>
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">Hướng dẫn</p>
                <p className="m-0 mt-1 text-base font-bold sm:text-lg">{instruction}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
});
