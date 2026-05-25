import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NicknameSetupForm } from "./nickname-form";

export const dynamic = "force-dynamic";

export default async function NicknameOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("nickname, nickname_set, onboarding_completed")
    .eq("id", user.id)
    .single();

  // F75 fallback — 마이그레이션 미적용(nickname_set 컬럼 없음) 환경에서는 가드 자체를 비활성.
  // 사용자가 이 페이지를 직접 입력해 진입한 경우에도 의미 있는 안내로 redirect.
  const columnMissing =
    profileError &&
    (profileError.code === "42703" ||
      /column .*nickname_set.* does not exist/i.test(profileError.message));
  if (columnMissing) {
    redirect("/dashboard");
  }

  // 이미 설정 완료 — 후속 단계로 보냄
  if (profile?.nickname_set) {
    redirect(profile.onboarding_completed ? "/dashboard" : "/survey");
  }

  const emailPrefix = user.email?.split("@")[0] ?? "";
  const suggested =
    profile?.nickname && profile.nickname !== emailPrefix ? profile.nickname : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gs-navy via-gs-navy-mid to-gs-navy-bright text-white px-6 py-12">
      <div className="max-w-[480px] w-full text-center">
        <div className="text-sm font-bold tracking-[-0.01em] text-gs-gold mb-3">
          ✨ 시작하기 전에
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] leading-[1.2] mb-4">
          어떻게 불러드릴까요?
        </h1>
        <p className="text-base text-white/80 mb-8 leading-[1.7]">
          닉네임은 한 번 정하면 <b className="text-gs-gold">바꿀 수 없어요</b>.
          <br />
          신중히 골라주세요.
        </p>
        <NicknameSetupForm suggested={suggested} />
      </div>
    </div>
  );
}
