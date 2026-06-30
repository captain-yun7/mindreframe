"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { writeAudit } from "./_audit";

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

const VALID_CATEGORIES = ["person", "nature", "music"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

export interface MeditationInput {
  slug: string;
  category: Category;
  title: string;
  description?: string | null;
  durationSeconds: number;
  audioUrl?: string | null;
  videoId?: string | null;
  orderIndex: number;
  requiredPlan?: "pro" | null;
}

function validate(input: MeditationInput): string | null {
  if (!input.slug || !/^[a-z0-9-]+$/.test(input.slug)) {
    return "slug는 영문 소문자/숫자/하이픈만";
  }
  if (input.slug.length > 80) return "slug는 80자 이내";
  if (!VALID_CATEGORIES.includes(input.category)) return "category 오류";
  if (!input.title || input.title.length === 0 || input.title.length > 200) {
    return "title은 1~200자";
  }
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 30 || input.durationSeconds > 3600) {
    return "duration은 30~3600초";
  }
  if (input.audioUrl && !/^https?:\/\//.test(input.audioUrl)) {
    return "audio_url은 http(s)로 시작";
  }
  if (input.videoId && !/^[a-z0-9]{32}$/i.test(input.videoId)) {
    return "video_id는 Cloudflare Stream 32자 hex";
  }
  if (!input.audioUrl && !input.videoId) {
    return "audio_url 또는 video_id 중 하나는 필수";
  }
  return null;
}

export async function adminCreateMeditation(input: MeditationInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const { data, error } = await supabaseAdmin
    .from("meditations")
    .insert({
      slug: input.slug,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      duration_seconds: input.durationSeconds,
      audio_url: input.audioUrl ?? null,
      video_id: input.videoId ?? null,
      order_index: input.orderIndex,
      required_plan: input.requiredPlan ?? null,
      updated_by: guard.userId,
    })
    .select("id, slug")
    .single();
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "meditation.create",
    payload: { slug: input.slug },
  });

  revalidatePath("/admin/meditations");
  revalidatePath("/meditation");
  return { ok: true as const, id: data.id, slug: data.slug };
}

export async function adminUpdateMeditation(id: string, input: MeditationInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const { error } = await supabaseAdmin
    .from("meditations")
    .update({
      slug: input.slug,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      duration_seconds: input.durationSeconds,
      audio_url: input.audioUrl ?? null,
      video_id: input.videoId ?? null,
      order_index: input.orderIndex,
      required_plan: input.requiredPlan ?? null,
      updated_by: guard.userId,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "meditation.update",
    payload: { id },
  });

  revalidatePath("/admin/meditations");
  revalidatePath("/meditation");
  return { ok: true as const };
}

export async function adminDeleteMeditation(id: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const { error } = await supabaseAdmin.from("meditations").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "meditation.delete",
    payload: { id },
  });

  revalidatePath("/admin/meditations");
  revalidatePath("/meditation");
  return { ok: true as const };
}
