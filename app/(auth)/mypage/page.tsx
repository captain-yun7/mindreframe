import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card, CardTitle } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LogoutButton } from "./logout-button";
import { NotificationSettings } from "./notification-settings";
import { CoachViewConsentToggle } from "./coach-view-consent-toggle";

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
    <PageLayout>
      <PageTitle>마이페이지</PageTitle>

      <Card className="mt-6">
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

      <Card className="mt-4">
        <CardTitle>구독 & 결제</CardTitle>
        <div className="mt-4 space-y-2">
          <Link
            href="/pricing"
            className="block w-full py-3 text-center rounded-[14px] border border-gs-line-soft bg-white text-sm font-bold hover:bg-gs-surface-mid transition-colors"
          >
            요금제 변경
          </Link>
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-[14px] border border-gs-line-soft bg-white text-sm font-bold text-gs-muted cursor-not-allowed opacity-60"
          >
            결제 내역 보기 (PG 심사 후)
          </button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>알림</CardTitle>
        <div className="mt-4">
          <NotificationSettings
            initialHour={profile.notificationHour}
            phoneRegistered={!!profile.phoneNumber}
            notificationsActive={!!profile.notificationsStartedAt}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>상담사 열람 동의</CardTitle>
        <p className="text-xs text-gs-muted mt-1 leading-[1.6]">
          1:1 코칭 중인 상담사가 내 행동연습장 기록을 참고할 수 있도록 허용합니다.
          언제든 다시 해제할 수 있어요.
        </p>
        <div className="mt-3">
          <CoachViewConsentToggle initial={profile.allowCoachViewExercise} />
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>설정</CardTitle>
        <div className="mt-4 space-y-2">
          <LogoutButton />
        </div>
      </Card>
    </PageLayout>
  );
}
