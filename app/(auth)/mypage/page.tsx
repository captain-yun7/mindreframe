import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card, CardTitle } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LogoutButton } from "./logout-button";
import { NicknameForm } from "./nickname-form";
import { NotificationSettings } from "./notification-settings";

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
  } = {
    nickname: "사용자",
    plan: "free",
    email: "",
    phoneNumber: null,
    notificationHour: 9,
    notificationsStartedAt: null,
  };

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("nickname, email, plan, phone_number, notification_hour, notifications_started_at")
      .eq("id", user.id)
      .single();
    if (data) {
      profile = {
        nickname: data.nickname || user.user_metadata?.full_name || "사용자",
        email: data.email?.endsWith("@oauth.local") ? "(이메일 미제공)" : data.email,
        plan: data.plan ?? "free",
        phoneNumber: data.phone_number ?? null,
        notificationHour: data.notification_hour ?? 9,
        notificationsStartedAt: data.notifications_started_at ?? null,
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
      };
    }
  }

  return (
    <PageLayout>
      <PageTitle>마이페이지</PageTitle>

      <Card className="mt-6">
        <CardTitle>프로필</CardTitle>
        <div className="mt-4 space-y-3">
          <NicknameForm initial={profile.nickname} />
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
        <CardTitle>설정</CardTitle>
        <div className="mt-4 space-y-2">
          <LogoutButton />
        </div>
      </Card>
    </PageLayout>
  );
}
