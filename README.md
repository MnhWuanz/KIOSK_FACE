# Kiosk điểm danh sinh viên

Frontend kiosk tối ưu cho tablet, gồm hai luồng chính:

1. Kích hoạt thiết bị bằng OTP 6 số.
2. Tự động điểm danh bằng camera sau khi khuôn mặt đạt yêu cầu và người dùng nháy mắt.

## Công nghệ

- React + TypeScript
- Tailwind CSS
- Ant Design
- Axios
- react-webcam
- MediaPipe Face Landmarker

## Cấu trúc chính

```text
app/
  page.tsx                         Trang kích hoạt
  attendance/page.tsx             Trang điểm danh
src/
  features/activation/            API, hook và giao diện kích hoạt
  features/attendance/            API, camera, liveness và giao diện điểm danh
  shared/                          Thành phần, kiểu dữ liệu và tiện ích dùng chung
```

Mỗi feature tự quản lý `api`, `hooks`, `components` và `lib`. Mã gọi API không đặt trực tiếp trong component để dễ bảo trì và thay đổi Backend.

## Cấu hình

Tạo `.env.local` từ `.env.example`:

```env
VITE_API_URL=https://api.example.edu.vn
```

Backend cần cho phép CORS từ địa chỉ triển khai của frontend và hỗ trợ cookie ở `/auth/refresh`.

## Chạy dự án

```bash
npm install
npm run dev
```

Kiểm tra trước khi triển khai:

```bash
npm run lint
npm run build
```

## Luồng dữ liệu

- `POST /api/kiosks/activate`: gửi `{ code: "123456" }`, sau đó lưu `device_code` và `deviceToken`.
- `GET /api/kiosks/health`: kiểm tra kết nối mỗi 10 giây, timeout 3 giây.
- `GET /api/attendance-sessions/kiosk/today`: lấy ca học hiện tại và quyền điểm danh.
- `POST /api/attendance-records/check-in`: gửi ảnh JPEG, `captureId`, `capturedAt`, `liveness` và `faceQuality` bằng `multipart/form-data`.

Axios tự gắn `x-kiosk-device-code`, `x-kiosk-token` và Access Token nếu có. Khi gặp lỗi 401, ứng dụng thử `/auth/refresh` một lần; nếu thất bại sẽ xóa phiên thiết bị và quay lại trang kích hoạt.

## Lưu ý tích hợp Backend

Tài liệu API hiện có minh họa mã kích hoạt dạng `ACT-8899-102`, trong khi giao diện này thực hiện yêu cầu OTP 6 số và gửi nguyên 6 số ở trường `code`. Backend cần chấp nhận định dạng này.

`visibilityScore` ở frontend là chỉ số chất lượng hình học ước lượng từ landmark (vị trí, kích thước, biên khung), không phải kết luận chống giả mạo. Backend vẫn phải xác minh danh tính và liveness trước khi tạo bản ghi điểm danh.
