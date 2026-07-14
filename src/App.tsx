import { Providers } from "./providers";
import { useHashPath } from "./shared/hooks/useRouter";
import { ActivationScreen } from "./features/activation/components/ActivationScreen";
import { AttendanceScreen } from "./features/attendance/components/AttendanceScreen";

export default function App() {
  const hash = useHashPath();

  return (
    <Providers>
      {hash === "#/attendance" ? <AttendanceScreen /> : <ActivationScreen />}
    </Providers>
  );
}
