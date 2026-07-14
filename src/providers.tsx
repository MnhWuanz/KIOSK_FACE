import { App, ConfigProvider } from "antd";
import type { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#2563eb",
          colorSuccess: "#16a34a",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          borderRadius: 14,
          fontFamily: "Arial, sans-serif",
          controlHeight: 46,
        },
        components: {
          Button: { fontWeight: 650 },
          Notification: { borderRadiusLG: 18 },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
