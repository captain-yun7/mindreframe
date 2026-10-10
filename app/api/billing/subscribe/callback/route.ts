import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase-server";
import { startSubscription } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";
// 빌링키 발급 + 첫 자동결제 승인(최대 60초)
export const maxDuration = 120;

/** 토스 카드 등록 성공 리다이렉트 (?customerKey&authKey) → 구독 시작 후 결과 화면으로. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authKey = url.searchParams.get("authKey");
  const customerKey = url.searchParams.get("customerKey");

  const back = (message: string) => {
    const to = new URL("/subscribe", url.origin);
    to.searchParams.set("message", message);
    return NextResponse.redirect(to, { status: 303 });
  };

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/subscribe", url.origin), { status: 303 });
  if (!authKey || !customerKey) return back("카드 등록 정보가 없어요. 다시 시도해주세요");

  const result = await startSubscription({ userId: user.id, authKey, customerKey });
  if (!result.ok) return back(result.message);

  revalidatePath("/mypage");
  revalidatePath("/pricing");
  return NextResponse.redirect(new URL("/subscribe/done", url.origin), { status: 303 });
}
