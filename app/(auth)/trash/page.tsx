import { redirect } from "next/navigation";
import { getSiteSettings, parseSettingJson, type PopupContent } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessFeature, normalizePlan } from "@/lib/auth/plan";
import { TrashClient } from "./trash-client";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["mindtheater00@gmail.com"];

export default async function TrashPage() {
  // 2차 가드 — 생각쓰레기통은 light 이상(free 차단). 운영자 면제.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("plan, role")
      .eq("id", user.id)
      .single();
    const isAdmin =
      profile?.role === "admin" ||
      (user.email && ADMIN_EMAILS.includes(user.email));
    if (!isAdmin) {
      const plan = normalizePlan(profile?.plan);
      if (!canAccessFeature(plan, "trash")) {
        redirect("/pricing?from=/trash&required=trash");
      }
    }
  }

  const settings = await getSiteSettings();
  const heroSubtitle = settings.trash_hero_subtitle;
  const popup = parseSettingJson<PopupContent>(
    settings.popup_trash_intro,
    '{"title":"왜 생각을 나눌까요?","body":"","cta":"시작하기"}',
  );

  return <TrashClient heroSubtitle={heroSubtitle} popup={popup} />;
}
