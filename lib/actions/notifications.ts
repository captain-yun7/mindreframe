"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateNotificationHour(hour: number) {
  if (!Number.isInteger(hour) || hour < 8 || hour > 20) {
    return { ok: false as const, error: "발송 시간은 08:00 ~ 20:00 사이여야 해요" };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("users")
    .update({ notification_hour: hour })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: "변경 실패" };

  revalidatePath("/mypage");
  return { ok: true as const };
}

/**
 * 결제 완료 시 휴대폰 번호 + 알림 시작일 기록.
 * 토스 PG webhook 또는 베타 mock 결제 server action에서 호출.
 */
export async function startNotifications(userId: string, phoneNumber: string) {
  const cleaned = phoneNumber.replace(/[^0-9]/g, "");
  if (!/^01[0-9]{8,9}$/.test(cleaned)) {
    return { ok: false as const, error: "휴대폰 번호 형식이 올바르지 않아요" };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({
      phone_number: cleaned,
      notifications_started_at: new Date().toISOString().slice(0, 10),
    })
    .eq("id", userId);
  if (error) return { ok: false as const, error: "휴대폰 번호 등록 실패" };
  return { ok: true as const };
}
