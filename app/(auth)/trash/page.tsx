import { getSiteSettings, parseSettingJson, type PopupContent } from "@/lib/site-settings";
import { TrashClient } from "./trash-client";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const settings = await getSiteSettings();
  const heroSubtitle = settings.trash_hero_subtitle;
  const popup = parseSettingJson<PopupContent>(
    settings.popup_trash_intro,
    '{"title":"왜 생각을 나눌까요?","body":"","cta":"시작하기"}',
  );

  return <TrashClient heroSubtitle={heroSubtitle} popup={popup} />;
}
