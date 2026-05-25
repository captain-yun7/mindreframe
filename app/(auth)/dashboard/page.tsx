import { loadTodayDashboard } from "@/lib/actions/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DashboardClient, type DashboardInitial } from "./dashboard-client";

export const dynamic = "force-dynamic";

async function loadNickname(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", user.id)
      .single();
    return (data?.nickname as string | null) ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const [r, nickname] = await Promise.all([loadTodayDashboard(), loadNickname()]);

  // F12: server-side에서 initial 데이터 fetch → 첫 렌더부터 채워진 상태 (깜빡임 제거)
  const initial: DashboardInitial = r.ok
    ? {
        moodScore: r.moodScore,
        gratitudeContent: r.gratitudeContent ?? "",
        gratitudeDone: r.gratitudeDone,
        checkedKeys: r.checkedKeys,
        today: r.today,
        streak: r.streak,
        totalDays: r.totalDays,
        nickname,
      }
    : {
        moodScore: null,
        gratitudeContent: "",
        gratitudeDone: false,
        checkedKeys: [],
        today: new Date().toISOString().slice(0, 10),
        streak: 0,
        totalDays: 0,
        nickname,
      };

  return <DashboardClient initial={initial} />;
}
