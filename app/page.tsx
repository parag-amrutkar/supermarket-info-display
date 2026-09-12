import { KioskShell } from "@/components/kiosk/kiosk-shell";
import { TENANTS } from "@/lib/tenants";

export default function Home() {
  return <KioskShell tenants={TENANTS} />;
}
