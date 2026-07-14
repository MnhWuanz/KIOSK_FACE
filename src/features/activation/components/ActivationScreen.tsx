'use client';

import { App, Button, Input } from 'antd';
import { useRouter } from '@/src/shared/hooks/useRouter';
import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/src/shared/lib/api-client';
import { isActivated, saveActivation } from '@/src/shared/lib/device-storage';
import { useClock } from '@/src/shared/hooks/useClock';
import { activateKiosk } from '../api/activation.api';
import { useBackendHealth } from '../hooks/useBackendHealth';

export function ActivationScreen() {
  const router = useRouter();
  const { notification } = App.useApp();
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const online = useBackendHealth();
  const clock = useClock();

  useEffect(() => {
    if (isActivated()) router.replace('/attendance');
  }, [router]);

  async function handleActivate() {
    if (!/^\d{6}$/.test(otp)) {
      notification.warning({
        message: 'Mã chưa hợp lệ',
        description: 'Vui lòng nhập đủ 6 chữ số.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const response = await activateKiosk(otp);
      saveActivation(response.data);
      notification.success({
        message: 'Kích hoạt thành công',
        description: response.message,
      });
      window.setTimeout(() => router.replace('/attendance'), 450);
    } catch (error) {
      notification.error({
        message: 'Không thể kích hoạt thiết bị',
        description: getApiErrorMessage(
          error,
          'Mã kích hoạt không đúng hoặc đã hết hạn.',
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="kiosk-shell soft-grid grid min-h-svh place-items-center px-5 py-6 sm:px-8">
      <div className="absolute left-6 top-5 hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
        <span
          className={`size-2 rounded-full ${online ? 'bg-emerald-500' : online === false ? 'bg-red-500' : 'bg-slate-300'}`}
        />
        {online
          ? 'Máy chủ trực tuyến'
          : online === false
            ? 'Mất kết nối máy chủ'
            : 'Đang kiểm tra kết nối'}
      </div>

      <div className="absolute right-6 top-5 hidden text-right sm:block">
        <p className="m-0 text-sm font-bold text-slate-800">{clock.time}</p>
        <p className="m-0 mt-0.5 text-xs capitalize text-slate-500">
          {clock.date}
        </p>
      </div>

      <section className="grid w-full max-w-[800px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.13)] ">
        <div className="flex min-h-[600px] flex-col px-6 py-7 sm:px-12 sm:py-10 lg:min-h-[620px] lg:px-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="m-0 text-xl font-bold">Hệ thống điểm danh</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
              Chưa kích hoạt
            </span>
          </div>

          <div className="my-auto py-10">
            <h2 className="m-0 mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[38px]">
              Nhập mã kích hoạt
            </h2>
            <p className="m-0 mt-3 max-w-md text-[15px] leading-6 text-slate-500">
              Nhập mã gồm 6 chữ số được tạo từ trang quản trị để bắt đầu sử dụng
              thiết bị này.
            </p>
            <div className="my-8 flex justify-center">
              <Input.OTP
                autoFocus
                className="activation-otp"
                length={6}
                value={otp}
                onChange={(value) => setOtp(value.replace(/\D/g, ''))}
                onInput={(values) => setOtp(values.join('').replace(/\D/g, ''))}
                formatter={(value) => value.replace(/\D/g, '')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && otp.length === 6)
                    void handleActivate();
                }}
              />
            </div>
            <Button
              type="primary"
              size="large"
              block
              className="mt-7 h-13! rounded-2xl! shadow-lg shadow-blue-600/20"
              disabled={otp.length !== 6 || online === false}
              loading={submitting}
              onClick={() => void handleActivate()}
            >
              {submitting ? 'Đang kết nối...' : 'Kích hoạt thiết bị'}
            </Button>

            {online === false && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-center text-xs font-medium text-red-700">
                Không thể kết nối máy chủ. Vui lòng kiểm tra mạng trước khi kích
                hoạt.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
