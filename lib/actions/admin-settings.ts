"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  invalidatePromptsCache,
  invalidateModelsCache,
  ALLOWED_MODEL_VALUES,
} from "@/lib/cbt/prompts-loader";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.email === "mindtheater00@gmail.com") return { ok: true, userId: user.id };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

// Sprint C에서 편집 차단되는 키 (회사 주소 등 사용자 결정 대기)
const READONLY_KEYS = new Set<string>(["footer_address"]);
const VALID_KEY_RE = /^[a-z_][a-z0-9_]*$/;

// H3: JSON으로 저장돼야 하는 키 (서버에서 한번 더 검증)
const JSON_KEYS = new Set<string>([
  "landing_menu_items",
  "landing_stats",
  "landing_final_cta",
  "popup_trash_intro",
  "popup_chat_intro",
  "popup_meditation_focus",
  "popup_exercise_step1",
  "popup_exercise_step2",
  "popup_exercise_step3",
  "popup_exercise_step4_praise",
]);

export async function adminUpdateSiteSetting(key: string, value: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  if (!key || !VALID_KEY_RE.test(key) || key.length > 80) {
    return { ok: false as const, error: "key 형식 오류 (소문자/숫자/_)" };
  }
  if (READONLY_KEYS.has(key)) {
    return { ok: false as const, error: "이 항목은 현재 변경 보류 중입니다" };
  }
  if (typeof value !== "string") return { ok: false as const, error: "value 타입 오류" };
  if (value.length > 200_000) return { ok: false as const, error: "값은 200,000자 이내" };

  // H3: JSON 키는 파싱 검증 (잘못된 JSON 저장 차단)
  if (JSON_KEYS.has(key) && value.trim()) {
    try {
      JSON.parse(value);
    } catch (e) {
      return {
        ok: false as const,
        error: `JSON 형식 오류: ${e instanceof Error ? e.message : "파싱 실패"}`,
      };
    }
  }

  const { error } = await supabaseAdmin.from("site_settings").upsert({
    key,
    value,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  // SiteFooter는 모든 page의 layout에 포함되므로 layout 전체 revalidate
  // H3: 랜딩·페이지 hero subtitle/팝업도 변경 시 즉시 반영
  revalidatePath("/admin/settings");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/trash");
  revalidatePath("/chat");
  revalidatePath("/progress");
  revalidatePath("/exercise");
  revalidatePath("/meditation");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * J3 / F144 — 분석기 프롬프트 4종 (prompt_*) 전용 저장.
 * adminUpdateSiteSetting과 거의 동일하지만 audit 로그 분리 + cache 무효화.
 */
const PROMPT_KEYS = new Set([
  "prompt_analyzer_main",
  "prompt_analyzer_therapy",
  "prompt_analyzer_finalize",
  "prompt_trash_main",
]);

export async function adminUpdatePrompt(key: string, value: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  if (!PROMPT_KEYS.has(key)) {
    return { ok: false as const, error: "허용되지 않은 prompt key" };
  }
  if (typeof value !== "string") return { ok: false as const, error: "value 타입 오류" };
  if (value.length > 200_000) return { ok: false as const, error: "값은 200,000자 이내" };

  const { error } = await supabaseAdmin.from("site_settings").upsert({
    key,
    value,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  invalidatePromptsCache();
  revalidatePath("/admin/prompts");
  return { ok: true as const };
}

/**
 * F216 — AI 모델 선택 (model_analyzer / model_therapy / model_trash).
 * 허용 모델 목록 외에는 거부. 빈값은 허용 (코드 default로 복귀).
 */
const MODEL_KEYS = new Set([
  "model_analyzer",
  "model_therapy",
  "model_trash",
]);

export async function adminUpdateModel(key: string, value: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  if (!MODEL_KEYS.has(key)) {
    return { ok: false as const, error: "허용되지 않은 model key" };
  }
  if (typeof value !== "string") return { ok: false as const, error: "value 타입 오류" };

  const trimmed = value.trim();
  if (trimmed && !ALLOWED_MODEL_VALUES.has(trimmed as never)) {
    return { ok: false as const, error: "허용되지 않은 모델명" };
  }

  const { error } = await supabaseAdmin.from("site_settings").upsert({
    key,
    value: trimmed,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  invalidateModelsCache();
  revalidatePath("/admin/prompts");
  return { ok: true as const };
}
