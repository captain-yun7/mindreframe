import Link from "next/link";
import { Card, CardTitle } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LogoutButton } from "./logout-button";
import { NotificationSettings } from "./notification-settings";
import { CoachViewConsentToggle } from "./coach-view-consent-toggle";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";

export default async function MyPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: {
    nickname: string;
    email: string;
    plan: string;
    phoneNumber: string | null;
    notificationHour: number;
    notificationsStartedAt: string | null;
    allowCoachViewExercise: boolean;
  } = {
    nickname: "사용자",
    plan: "free",
    email: "",
    phoneNumber: null,
    notificationHour: 9,
    notificationsStartedAt: null,
    allowCoachViewExercise: false,
  };

  if (user) {
    // allow_coach_view_exercise 컬럼 미적용 환경 fallback
    let data: Record<string, unknown> | null = null;
    {
      const baseCols =
        "nickname, email, plan, phone_number, notification_hour, notifications_started_at";
      const res = await supabase
        .from("users")
        .select(`${baseCols}, allow_coach_view_exercise`)
        .eq("id", user.id)
        .single();
      if (
        res.error &&
        ((res.error as { code?: string }).code === "42703" ||
          /allow_coach_view_exercise/.test(res.error.message))
      ) {
        const r2 = await supabase
          .from("users")
          .select(baseCols)
          .eq("id", user.id)
          .single();
        data = (r2.data as Record<string, unknown> | null) ?? null;
      } else {
        data = (res.data as Record<string, unknown> | null) ?? null;
      }
    }
    if (data) {
      profile = {
        nickname:
          (data.nickname as string) ||
          user.user_metadata?.full_name ||
          "사용자",
        email: (data.email as string)?.endsWith("@oauth.local")
          ? "(이메일 미제공)"
          : (data.email as string),
        plan: (data.plan as string) ?? "free",
        phoneNumber: (data.phone_number as string | null) ?? null,
        notificationHour: (data.notification_hour as number) ?? 9,
        notificationsStartedAt:
          (data.notifications_started_at as string | null) ?? null,
        allowCoachViewExercise:
          (data.allow_coach_view_exercise as boolean | undefined) ?? false,
      };
    } else {
      profile = {
        nickname:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "사용자",
        email: user.email ?? "",
        plan: "free",
        phoneNumber: null,
        notificationHour: 9,
        notificationsStartedAt: null,
        allowCoachViewExercise: false,
      };
    }
  }

  return (
    <PageFade>
      {/* ── 단순 page title (이모지 살짝) ── */}
      <section className="bg-gs-navy-50 py-10 md:py-12">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <FadeIn delay={0} y={16}>
            <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-2">
              마이페이지
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
              {profile.nickname}님 👤
            </h1>
            <p className="mt-3 text-sm md:text-base text-gs-muted-soft">
              알림·구독·계정 설정을 여기서 관리해요.
            </p>
          </FadeIn>
        </div>
      </section>

      <main className="max-w-[820px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <FadeIn>
          <Card className="shadow-toss-card">
            <CardTitle>프로필</CardTitle>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gs-muted">닉네임</span>
                <span data-testid="profile-nickname" className="text-sm font-bold">
                  {profile.nickname}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gs-muted">이메일</span>
                <span data-testid="profile-email" className="text-sm font-bold">
                  {profile.email || "미등록"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gs-muted">현재 플랜</span>
                <span data-testid="profile-plan" className="text-sm font-bold uppercase">
                  {profile.plan}
                </span>
              </div>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>구독 & 결제</CardTitle>
            <div className="mt-4 space-y-2">
              <Link
                href="/pricing"
                className="block w-full py-3 text-center rounded-toss-button border border-gs-line-soft bg-white text-sm font-bold hover:bg-gs-navy-50 hover:-translate-y-0.5 hover:shadow-toss-card transition-all"
              >
                요금제 변경
              </Link>
              <button
                type="button"
                disabled
                className="w-full py-3 rounded-toss-button border border-gs-line-soft bg-white text-sm font-bold text-gs-muted cursor-not-allowed opacity-60"
              >
                결제 내역 보기 (PG 심사 후)
              </button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>알림</CardTitle>
            <div className="mt-4">
              <NotificationSettings
                initialHour={profile.notificationHour}
                phoneRegistered={!!profile.phoneNumber}
                notificationsActive={!!profile.notificationsStartedAt}
              />
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>코치 열람 동의</CardTitle>
            <p className="text-xs text-gs-muted mt-1 leading-[1.6]">
              1:1 코칭 중인 코치가 내 행동연습장 기록을 참고할 수 있도록 허용합니다.
              언제든 다시 해제할 수 있어요.
            </p>
            <div className="mt-3">
              <CoachViewConsentToggle initial={profile.allowCoachViewExercise} />
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>설정</CardTitle>
            <div className="mt-4 space-y-2">
              <LogoutButton />
            </div>
          </Card>
        </FadeIn>
      </main>
    </PageFade>
  );
}
