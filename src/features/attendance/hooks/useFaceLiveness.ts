import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type Webcam from 'react-webcam';
import type {
  FaceQualityResult,
  LivenessResult,
} from '@/src/shared/types/kiosk';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL = '/models/face_landmarker.task';
const EYES_OPEN_REQUIRED_MS = 2_000;
const DETECTION_INTERVAL_MS = 90;

export type FacePhase =
  | 'loading'
  | 'camera'
  | 'no-face'
  | 'multiple'
  | 'position'
  | 'blink'
  | 'hold'
  | 'ready'
  | 'error';

interface FaceState {
  phase: FacePhase;
  instruction: string;
  progress: number;
  liveness: LivenessResult;
  quality: FaceQualityResult;
}

const initialState: FaceState = {
  phase: 'loading',
  instruction: 'Đang tải bộ nhận diện khuôn mặt...',
  progress: 0,
  liveness: {
    blinkPassed: false,
    eyesOpenPassed: false,
    closedFrames: 0,
    eyesOpenDurationMs: 0,
  },
  quality: {
    faceCount: 0,
    inFrameScore: 0,
    visibilityScore: 0,
    issues: ['NO_FACE'],
  },
};

// Thông số ellipse của face-guide CSS:
// left: 50%, top: 48%, width: min(48%, 500px) → rx ≈ 0.24 (normalized)
// aspect-ratio: 0.76 → height = width / 0.76 → ry ≈ 0.24 / 0.76 ≈ 0.316
const OVAL_CX = 0.5;
const OVAL_CY = 0.48;
const OVAL_RX = 0.24;      // bán trục ngang (normalized theo chiều rộng video)
const OVAL_RY = 0.316;     // bán trục dọc  (normalized theo chiều cao video)
// Co nhỏ vùng kiểm tra thêm 1 padding để bounding box nằm hoàn toàn bên trong
const OVAL_PADDING = 0.03;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Kiểm tra xem bounding box khuôn mặt có nằm HOÀN TOÀN bên trong ellipse oval không.
 * Dùng điều kiện: mỗi góc của bbox phải thoả phương trình ellipse.
 */
function isFaceInsideOval(landmarks: NormalizedLandmark[]): boolean {
  const xs = landmarks.map((p) => p.x);
  const ys = landmarks.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 4 góc của bounding box + tâm
  const checkPoints = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  ];

  const rx = OVAL_RX - OVAL_PADDING;
  const ry = OVAL_RY - OVAL_PADDING;

  return checkPoints.every((pt) => {
    const dx = (pt.x - OVAL_CX) / rx;
    const dy = (pt.y - OVAL_CY) / ry;
    return dx * dx + dy * dy <= 1.0;
  });
}

function scoreFace(landmarks: NormalizedLandmark[]): FaceQualityResult {
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const margin = Math.min(minX, 1 - maxX, minY, 1 - maxY);
  const sizeScore = clamp(1 - Math.abs(width - 0.38) / 0.24);
  const centerScore = clamp(
    1 - (Math.abs(centerX - 0.5) + Math.abs(centerY - 0.47)) * 1.8,
  );
  const marginScore = clamp(margin / 0.09);
  const inFrameScore = Number(
    (sizeScore * 0.36 + centerScore * 0.44 + marginScore * 0.2).toFixed(2),
  );
  const issues: string[] = [];

  if (width < 0.2 || height < 0.24) issues.push('FACE_TOO_FAR');
  if (width > 0.72 || height > 0.82) issues.push('FACE_TOO_CLOSE');
  if (centerScore < 0.65) issues.push('FACE_NOT_CENTERED');
  if (margin <= 0.02) issues.push('FACE_OUT_OF_FRAME');

  return {
    faceCount: 1,
    inFrameScore,
    visibilityScore: Number(
      clamp(0.68 + sizeScore * 0.2 + marginScore * 0.12).toFixed(2),
    ),
    issues,
  };
}

export function useFaceLiveness(
  webcamRef: RefObject<Webcam | null>,
  enabled: boolean,
) {
  const [state, setState] = useState<FaceState>(initialState);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const blinkPassedRef = useRef(false);
  const closedFramesRef = useRef(0);
  const openedAtRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastProcessedAtRef = useRef(0);

  const reset = useCallback(() => {
    blinkPassedRef.current = false;
    closedFramesRef.current = 0;
    openedAtRef.current = null;
    setState({
      ...initialState,
      phase: 'camera',
      instruction: 'Đưa khuôn mặt vào khung hình',
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.62,
          minFacePresenceConfidence: 0.62,
          minTrackingConfidence: 0.58,
        });
        if (!active) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setState((current) => ({
          ...current,
          phase: 'camera',
          instruction: 'Đưa khuôn mặt vào khung hình',
        }));
      } catch {
        if (active) {
          setState((current) => ({
            ...current,
            phase: 'error',
            instruction: 'Không thể tải bộ nhận diện khuôn mặt',
          }));
        }
      }
    }

    void setup();
    return () => {
      active = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    function detect() {
      if (!active) return;
      const video = webcamRef.current?.video;
      const landmarker = landmarkerRef.current;

      if (!video || video.readyState < 2 || !landmarker) {
        frameRef.current = requestAnimationFrame(detect);
        return;
      }

      const frameTime = performance.now();
      if (
        video.currentTime !== lastVideoTimeRef.current &&
        frameTime - lastProcessedAtRef.current >= DETECTION_INTERVAL_MS
      ) {
        lastVideoTimeRef.current = video.currentTime;
        lastProcessedAtRef.current = frameTime;
        const now = frameTime;
        const result = landmarker.detectForVideo(video, now);

        // Lọc: chỉ giữ lại những khuôn mặt nằm TRONG oval
        // → người đứng ngoài rìa/phía sau hoàn toàn bị bỏ qua
        const facesInOval = result.faceLandmarks
          .map((lm, idx) => ({ lm, idx }))
          .filter(({ lm }) => isFaceInsideOval(lm));

        const ovalFaceCount = facesInOval.length;

        if (ovalFaceCount === 0) {
          setState((current) => ({
            ...current,
            phase: 'no-face',
            instruction: 'Đưa khuôn mặt vào khung hình',
            progress: 0,
            quality: {
              faceCount: 0,
              inFrameScore: 0,
              visibilityScore: 0,
              issues: ['NO_FACE'],
            },
          }));
        } else if (ovalFaceCount > 1) {
          // Có nhiều hơn 1 khuôn mặt NẰM TRONG oval → mới cảnh báo
          setState((current) => ({
            ...current,
            phase: 'multiple',
            instruction: 'Chỉ một người đứng trước camera',
            progress: 0,
            quality: {
              faceCount: ovalFaceCount,
              inFrameScore: 0,
              visibilityScore: 0,
              issues: ['MULTIPLE_FACES'],
            },
          }));
        } else {
          // Đúng 1 khuôn mặt trong oval → xét các chỉ tiêu bình thường
          const { lm: landmarks, idx: faceIdx } = facesInOval[0];
          const quality = scoreFace(landmarks);
          const blendshapes =
            result.faceBlendshapes[faceIdx]?.categories ?? [];
          const left =
            blendshapes.find((item) => item.categoryName === 'eyeBlinkLeft')
              ?.score ?? 0;
          const right =
            blendshapes.find((item) => item.categoryName === 'eyeBlinkRight')
              ?.score ?? 0;
          const bothClosed = left > 0.52 && right > 0.52;
          const bothOpen = left < 0.28 && right < 0.28;
          const positioned =
            quality.issues.length === 0 && quality.inFrameScore >= 0.65;

          if (!positioned) {
            setState((current) => ({
              ...current,
              phase: 'position',
              instruction: quality.issues.includes('FACE_TOO_FAR')
                ? 'Tiến lại gần camera một chút'
                : quality.issues.includes('FACE_TOO_CLOSE')
                  ? 'Lùi lại một chút'
                  : 'Giữ khuôn mặt ở giữa khung',
              progress: 18,
              quality,
            }));
          } else if (!blinkPassedRef.current) {
            if (bothClosed) closedFramesRef.current += 1;
            if (closedFramesRef.current >= 2 && bothOpen) {
              blinkPassedRef.current = true;
              openedAtRef.current = now;
            }
            setState((current) => ({
              ...current,
              phase: blinkPassedRef.current ? 'hold' : 'blink',
              instruction: blinkPassedRef.current
                ? 'Nhìn thẳng và giữ yên'
                : 'Hãy nháy mắt một lần',
              progress: blinkPassedRef.current ? 58 : 36,
              quality,
              liveness: {
                ...current.liveness,
                blinkPassed: blinkPassedRef.current,
                closedFrames: closedFramesRef.current,
              },
            }));
          } else {
            const openDuration =
              bothOpen && openedAtRef.current ? now - openedAtRef.current : 0;
            if (!bothOpen) openedAtRef.current = now;
            const ready = openDuration >= EYES_OPEN_REQUIRED_MS;
            setState((current) => ({
              ...current,
              phase: ready ? 'ready' : 'hold',
              instruction: ready ? 'Đã sẵn sàng chụp' : 'Nhìn thẳng và giữ yên',
              progress: ready
                ? 100
                : Math.min(
                    94,
                    58 + (openDuration / EYES_OPEN_REQUIRED_MS) * 36,
                  ),
              quality,
              liveness: {
                blinkPassed: true,
                eyesOpenPassed: ready,
                closedFrames: closedFramesRef.current,
                eyesOpenDurationMs: Math.round(openDuration),
              },
            }));
          }
        }
      }

      frameRef.current = requestAnimationFrame(detect);
    }
    frameRef.current = requestAnimationFrame(detect);
    return () => {
      active = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, webcamRef]);
  return { ...state, reset };
}
