import { getSiteSettings, parseSettingJson, type PopupContent } from "@/lib/site-settings";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const settings = await getSiteSettings();
  const heroSubtitle = settings.chat_hero_subtitle;
  const popup = parseSettingJson<PopupContent>(
    settings.popup_chat_intro,
    '{"title":"가짜생각 분석기 사용법","body":"","cta":"시작하기"}',
  );

  return <ChatClient heroSubtitle={heroSubtitle} popup={popup} />;
}
