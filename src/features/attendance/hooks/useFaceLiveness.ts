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

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
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
  const sizeScore = clamp(1 - Math.abs(width - 0.38) / 0.22);
  const centerScore = clamp(
    1 - (Math.abs(centerX - 0.5) + Math.abs(centerY - 0.47)) * 2.4,
  );
  const marginScore = clamp(margin / 0.09);
  const inFrameScore = Number(
    (sizeScore * 0.36 + centerScore * 0.44 + marginScore * 0.2).toFixed(2),
  );
  const issues: string[] = [];

  if (width < 0.26 || height < 0.32) issues.push('FACE_TOO_FAR');
  if (width > 0.65 || height > 0.78) issues.push('FACE_TOO_CLOSE');
  if (centerScore < 0.72) issues.push('FACE_NOT_CENTERED');
  if (margin <= 0.035) issues.push('FACE_OUT_OF_FRAME');

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
        const faceCount = result.faceLandmarks.length;

        if (faceCount === 0) {
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
        } else if (faceCount > 1) {
          setState((current) => ({
            ...current,
            phase: 'multiple',
            instruction: 'Chỉ một người đứng trước camera',
            progress: 0,
            quality: {
              faceCount,
              inFrameScore: 0,
              visibilityScore: 0,
              issues: ['MULTIPLE_FACES'],
            },
          }));
        } else {
          const quality = scoreFace(result.faceLandmarks[0]);
          const blendshapes = result.faceBlendshapes[0]?.categories ?? [];
          const left =
            blendshapes.find((item) => item.categoryName === 'eyeBlinkLeft')
              ?.score ?? 0;
          const right =
            blendshapes.find((item) => item.categoryName === 'eyeBlinkRight')
              ?.score ?? 0;
          const bothClosed = left > 0.52 && right > 0.52;
          const bothOpen = left < 0.28 && right < 0.28;
          const positioned =
            quality.issues.length === 0 && quality.inFrameScore >= 0.72;

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
