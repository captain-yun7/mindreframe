import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 만료된 유료 플랜을 free로 강등.
 * Vercel Cron이 매일 자정 KST(= UTC 15:00)에 호출.
 * 보안: CRON_SECRET 검증.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ plan: "free", updated_at: now })
    .lt("plan_expires_at", now)
    .neq("plan", "free")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ downgraded: data?.length ?? 0 });
}
