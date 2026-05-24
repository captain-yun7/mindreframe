import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NicknameSetupForm } from "./nickname-form";

export const dynamic = "force-dynamic";

export default async function NicknameOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("nickname, nickname_set, onboarding_completed")
    .eq("id", user.id)
    .single();

  // 이미 설정 완료 — 후속 단계로 보냄
  if (profile?.nickname_set) {
    redirect(profile.onboarding_completed ? "/dashboard" : "/survey");
  }

  const emailPrefix = user.email?.split("@")[0] ?? "";
  const suggested =
    profile?.nickname && profile.nickname !== emailPrefix ? profile.nickname : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,var(--color-gs-navy)_0%,var(--color-gs-navy-mid)_45%,var(--color-gs-navy-bright)_100%)] text-white px-6">
      <div className="max-w-[460px] w-full text-center">
        <h1 className="text-2xl font-extrabold leading-[1.4] mb-3">
          어떻게 불러드릴까요?
        </h1>
        <p className="text-sm text-[#e5e7ff] mb-8 leading-[1.7]">
          닉네임은 한 번 정하면 <b>바꿀 수 없어요</b>.
          <br />
          신중히 골라주세요.
        </p>
        <NicknameSetupForm suggested={suggested} />
      </div>
    </div>
  );
}
