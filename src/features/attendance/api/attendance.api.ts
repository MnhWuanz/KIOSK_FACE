import { apiClient } from "@/src/shared/lib/api-client";
import type {
  ApiResponse,
  CheckInData,
  FaceQualityResult,
  LivenessResult,
  TodaySessionData,
} from "@/src/shared/types/kiosk";

export async function getTodaySessions() {
  const { data } = await apiClient.get<ApiResponse<TodaySessionData>>("/api/attendance-sessions/kiosk/today");
  return data;
}

interface CheckInPayload {
  file: Blob;
  captureId: string;
  capturedAt: string;
  liveness: LivenessResult;
  faceQuality: FaceQualityResult;
}

export async function checkInAttendance(payload: CheckInPayload) {
  const body = new FormData();
  body.append("file", payload.file, `${payload.captureId}.jpg`);
  body.append("captureId", payload.captureId);
  body.append("capturedAt", payload.capturedAt);
  body.append("liveness", JSON.stringify(payload.liveness));
  body.append("faceQuality", JSON.stringify(payload.faceQuality));

  const { data } = await apiClient.post<ApiResponse<CheckInData>>("/api/attendance-records/check-in", body);
  return data;
}
