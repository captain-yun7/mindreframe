import { redirect } from "next/navigation";
import { getSiteSettings, parseSettingJson, type PopupContent } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessFeature, isAdminUser, normalizePlan, UNLIMITED } from "@/lib/auth/plan";
import { getUserProfileForGuard } from "@/lib/auth/user-profile-guard";
import { checkUsageOnly } from "@/lib/ai/usage";
import { TrashClient } from "./trash-client";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  // 2차 가드 — 생각쓰레기통은 light 이상(free 차단). 운영자 면제.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialUsage: { used: number; limit: number; isUnlimited: boolean } | null = null;
  if (user) {
    const profile = await getUserProfileForGuard(user.id);
    if (!isAdminUser(user.email, (profile as { role?: string } | null)?.role)) {
      const plan = normalizePlan(profile?.plan);
      if (!canAccessFeature(plan, "trash")) {
        redirect("/pricing?from=/trash&required=trash");
      }
    }
    // K3·F184 — 진입 시 현재 사용량 fetch (운영자/플랜 차단은 위에서 처리)
    const usage = await checkUsageOnly(supabase, user.id, "trash");
    initialUsage = {
      used: usage.used,
      limit: usage.limit,
      isUnlimited: usage.limit >= UNLIMITED,
    };
  }

  const settings = await getSiteSettings();
  const heroSubtitle = settings.trash_hero_subtitle;
  const popup = parseSettingJson<PopupContent>(
    settings.popup_trash_intro,
    '{"title":"왜 생각을 나눌까요?","body":"","cta":"시작하기"}',
  );

  return (
    <TrashClient
      heroSubtitle={heroSubtitle}
      popup={popup}
      initialUsage={initialUsage ?? { used: 0, limit: 0, isUnlimited: false }}
    />
  );
}
