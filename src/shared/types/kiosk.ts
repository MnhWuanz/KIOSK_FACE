export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface KioskInfo {
  is_active?: boolean;
  device_code: string;
  device_name: string;
  room: { room_code: string };
}

export interface ActivationData {
  kiosk: KioskInfo;
  deviceToken: string;
}

export interface SessionSummary {
  idAttendanceSession: number;
  subjectName: string;
  checkinOpenAt: string;
  checkinCloseAt: string;
}

export interface TodaySessionData {
  hasSessionToday: boolean;
  hasOpenSession: boolean;
  canCheckIn: boolean;
  kiosk: {
    idKiosk: number;
    deviceCode: string;
    deviceName: string;
    roomCode: string;
  };
  currentSession: SessionSummary | null;
  sessions: SessionSummary[];
}

export interface LivenessResult {
  blinkPassed: boolean;
  eyesOpenPassed: boolean;
  closedFrames: number;
  eyesOpenDurationMs: number;
}

export interface FaceQualityResult {
  faceCount: number;
  inFrameScore: number;
  visibilityScore: number;
  issues: string[];
}

export interface CheckInData {
  student: { fullName: string; studentCode: string };
}
