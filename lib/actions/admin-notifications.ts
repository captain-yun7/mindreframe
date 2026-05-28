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
  if (user.email === "mindtheater00@gmail.com") return { ok: true, userId: user.id };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

export interface NotificationMessageInput {
  dayNumber: number;
  title?: string | null;
  content: string;
}

export async function adminUpdateNotificationMessage(input: NotificationMessageInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1 || input.dayNumber > 100) {
    return { ok: false as const, error: "day_number는 1~100" };
  }
  if (!input.content || input.content.trim().length === 0) {
    return { ok: false as const, error: "본문은 필수" };
  }
  if (input.content.length > 200) {
    return { ok: false as const, error: "본문은 200자 이내 (알림톡 변수 제약)" };
  }
  if (input.title && input.title.length > 80) {
    return { ok: false as const, error: "제목은 80자 이내" };
  }

  const { error } = await supabaseAdmin.from("notification_messages").upsert({
    day_number: input.dayNumber,
    title: input.title ?? null,
    content: input.content,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/notifications/messages");
  return { ok: true as const };
}
