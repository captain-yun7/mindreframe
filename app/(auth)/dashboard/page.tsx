import Link from "next/link";
import { loadTodayDashboard } from "@/lib/actions/dashboard";
import { getTodayDailyVideo, type TodayDailyVideo } from "@/lib/actions/daily-video";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSiteSettings } from "@/lib/site-settings";
import { DashboardClient, type DashboardInitial } from "./dashboard-client";

export const dynamic = "force-dynamic";

async function loadProfile(): Promise<{
  nickname: string | null;
  needsPhoneForNotifications: boolean;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { nickname: null, needsPhoneForNotifications: false };
    const { data } = await supabase
      .from("users")
      .select("nickname, plan, phone_number")
      .eq("id", user.id)
      .single();
    const row = data as { nickname: string | null; plan: string | null; phone_number: string | null } | null;
    return {
      nickname: row?.nickname ?? null,
      // 유료 플랜인데 휴대폰 미등록 → 알림톡 수신 불가 상태
      needsPhoneForNotifications: !!row && row.plan !== null && row.plan !== "free" && !row.phone_number,
    };
  } catch {
    return { nickname: null, needsPhoneForNotifications: false };
  }
}

export default async function DashboardPage() {
  const [r, profile, todayVideo, settings] = await Promise.all([
    loadTodayDashboard(),
    loadProfile(),
    getTodayDailyVideo(),
    getSiteSettings(),
  ]);
  const nickname = profile.nickname;
  const heroSubtitle = settings.dashboard_hero_subtitle;

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
        todayVideo: todayVideo as TodayDailyVideo,
        heroSubtitle,
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
        todayVideo: todayVideo as TodayDailyVideo,
        heroSubtitle,
      };

  return (
    <>
      {profile.needsPhoneForNotifications && (
        <div className="max-w-[960px] mx-auto px-5 pt-4">
          <Link
            href="/mypage"
            className="block px-4 py-3 rounded-toss-button bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm text-center leading-[1.6] hover:opacity-90"
          >
            📮 매일 아침 훈련 알림톡을 받으려면 휴대폰 번호를 등록해주세요.{" "}
            <span className="font-bold underline">마이페이지에서 등록하기 →</span>
          </Link>
        </div>
      )}
      <DashboardClient initial={initial} />
    </>
  );
}
