import { redirect } from "next/navigation";
import { getSiteSettings, parseSettingJson, type PopupContent } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessFeature, normalizePlan } from "@/lib/auth/plan";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["mindtheater00@gmail.com"];

export default async function ChatPage() {
  // 2차 가드 — 가짜생각 분석기는 light 이상(free 차단). 운영자 면제.
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
      if (!canAccessFeature(plan, "analyzer")) {
        redirect("/pricing?from=/chat&required=analyzer");
      }
    }
  }

  const settings = await getSiteSettings();
  const heroSubtitle = settings.chat_hero_subtitle;
  const popup = parseSettingJson<PopupContent>(
    settings.popup_chat_intro,
    '{"title":"가짜생각 분석기 사용법","body":"","cta":"시작하기"}',
  );

  return <ChatClient heroSubtitle={heroSubtitle} popup={popup} />;
}
