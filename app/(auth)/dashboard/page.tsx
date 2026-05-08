import { loadTodayDashboard } from "@/lib/actions/dashboard";
import { DashboardClient, type DashboardInitial } from "./dashboard-client";

export default async function DashboardPage() {
  const r = await loadTodayDashboard();

  // F12: server-side에서 initial 데이터 fetch → 첫 렌더부터 채워진 상태 (깜빡임 제거)
  const initial: DashboardInitial = r.ok
    ? {
        moodScore: r.moodScore,
        gratitudeContent: r.gratitudeContent ?? "",
        gratitudeDone: r.gratitudeDone,
        checkedKeys: r.checkedKeys,
        today: r.today,
      }
    : {
        moodScore: null,
        gratitudeContent: "",
        gratitudeDone: false,
        checkedKeys: [],
        today: new Date().toISOString().slice(0, 10),
      };

  return <DashboardClient initial={initial} />;
}
