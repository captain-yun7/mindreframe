"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

const VALID_CATEGORIES = ["core", "distortion", "body", "avoidance", "rumination"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

export interface StudyArticleInput {
  slug: string;
  category: Category;
  title: string;
  sub?: string | null;
  bodyHtml: string;
  orderIndex: number;
  videoId?: string | null;
  requiredPlan?: "pro" | null;
}

function validate(input: StudyArticleInput): string | null {
  if (!input.slug || !/^[a-z0-9-]+$/.test(input.slug)) return "slug는 영문 소문자/숫자/하이픈만";
  if (input.slug.length > 80) return "slug는 80자 이내";
  if (!VALID_CATEGORIES.includes(input.category)) return "category 값 오류";
  if (!input.title || input.title.length > 200) return "title은 1~200자";
  if (input.sub && input.sub.length > 300) return "sub는 300자 이내";
  if (!input.bodyHtml || input.bodyHtml.length < 10) return "본문은 최소 10자";
  if (input.bodyHtml.length > 200_000) return "본문은 최대 200,000자";
  if (input.videoId && !/^[a-z0-9]{32}$/i.test(input.videoId)) {
    return "video_id는 Cloudflare Stream 32자 hex";
  }
  return null;
}

export async function adminCreateStudyArticle(input: StudyArticleInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const { data, error } = await supabaseAdmin
    .from("study_articles")
    .insert({
      slug: input.slug,
      category: input.category,
      title: input.title,
      sub: input.sub ?? null,
      body_html: input.bodyHtml,
      order_index: input.orderIndex,
      video_id: input.videoId ?? null,
      required_plan: input.requiredPlan ?? null,
      updated_by: guard.userId,
    })
    .select("id, slug")
    .single();
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/study");
  revalidatePath("/study");
  revalidatePath(`/study/${data.slug}`);
  return { ok: true as const, id: data.id, slug: data.slug };
}

export async function adminUpdateStudyArticle(id: string, input: StudyArticleInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const { data: prev } = await supabaseAdmin
    .from("study_articles")
    .select("slug")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin
    .from("study_articles")
    .update({
      slug: input.slug,
      category: input.category,
      title: input.title,
      sub: input.sub ?? null,
      body_html: input.bodyHtml,
      order_index: input.orderIndex,
      video_id: input.videoId ?? null,
      required_plan: input.requiredPlan ?? null,
      updated_by: guard.userId,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/study");
  revalidatePath("/study");
  revalidatePath(`/study/${input.slug}`);
  if (prev?.slug && prev.slug !== input.slug) {
    revalidatePath(`/study/${prev.slug}`);
  }
  return { ok: true as const };
}

export async function adminDeleteStudyArticle(id: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const { data: row } = await supabaseAdmin
    .from("study_articles")
    .select("slug")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("study_articles").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/study");
  revalidatePath("/study");
  if (row?.slug) revalidatePath(`/study/${row.slug}`);
  return { ok: true as const };
}

// ─── 100일 알림 영상 — day_number PK ───────────────────────────

export interface NotificationVideoInput {
  dayNumber: number;
  title: string;
  description?: string | null;
  videoId?: string | null;
  durationSeconds?: number | null;
}

export async function adminUpsertNotificationVideo(input: NotificationVideoInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1 || input.dayNumber > 100) {
    return { ok: false as const, error: "day_number는 1~100" };
  }
  if (!input.title || input.title.length > 200) {
    return { ok: false as const, error: "title은 1~200자" };
  }
  if (input.videoId && !/^[a-z0-9]{32}$/i.test(input.videoId)) {
    return { ok: false as const, error: "video_id는 Cloudflare Stream 32자 hex" };
  }
  if (
    input.durationSeconds != null &&
    (!Number.isInteger(input.durationSeconds) ||
      input.durationSeconds < 0 ||
      input.durationSeconds > 36_000)
  ) {
    return { ok: false as const, error: "duration_seconds는 0~36000" };
  }

  const { error } = await supabaseAdmin.from("notification_videos").upsert({
    day_number: input.dayNumber,
    title: input.title,
    description: input.description ?? null,
    video_id: input.videoId ?? null,
    duration_seconds: input.durationSeconds ?? null,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/study/videos");
  return { ok: true as const };
}
