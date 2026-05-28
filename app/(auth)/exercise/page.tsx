import { redirect } from "next/navigation";
import {
  getSiteSettings,
  parseSettingJson,
  type PopupContent,
} from "@/lib/site-settings";
import { loadExerciseState } from "@/lib/actions/exercise-state";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessFeature, isAdminUser, normalizePlan } from "@/lib/auth/plan";
import { getUserProfileForGuard } from "@/lib/auth/user-profile-guard";
import { ExerciseClient } from "./exercise-client";

export const dynamic = "force-dynamic";

export default async function ExercisePage() {
  // 2차 가드 — middleware는 light 이상만 통과시키지만 행동연습장은 pro 차단이라
  // 페이지 server component에서 매트릭스로 재검증. 운영자(admin/이메일 화이트리스트)는 면제.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const profile = await getUserProfileForGuard(user.id);
    if (!isAdminUser(user.email, (profile as { role?: string } | null)?.role)) {
      const plan = normalizePlan(profile?.plan);
      if (!canAccessFeature(plan, "exercise")) {
        redirect("/pricing?from=/exercise&required=exercise");
      }
    }
  }

  const [settings, initialState] = await Promise.all([
    getSiteSettings(),
    loadExerciseState(),
  ]);

  const heroSubtitle = settings.exercise_hero_subtitle;
  const step1 = parseSettingJson<PopupContent>(
    settings.popup_exercise_step1,
    '{"title":"용기 한 걸음 🎯","body":"","cta":"시작하기"}',
  );
  const step2 = parseSettingJson<PopupContent>(
    settings.popup_exercise_step2,
    '{"title":"2단계 — 목록 만들기","body":"","cta":"네, 적어볼게요"}',
  );
  const step3 = parseSettingJson<PopupContent>(
    settings.popup_exercise_step3,
    '{"title":"3단계 — 오늘의 도전 선택","body":"","cta":"고를게요"}',
  );
  const step4Praise = parseSettingJson<PopupContent>(
    settings.popup_exercise_step4_praise,
    '{"title":"용기 레벨 1 획득 🏆","body":"","cta":"성장방에서 확인하기"}',
  );

  return (
    <ExerciseClient
      heroSubtitle={heroSubtitle}
      initialState={initialState}
      popups={{ step1, step2, step3, step4Praise }}
    />
  );
}
