// 임시 진단용 — 코치 어드민 users 조인 이슈 조사 후 즉시 제거 예정
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function jwtClaims(k: string | undefined) {
  if (!k) return null;
  try {
    const p = JSON.parse(Buffer.from(k.split(".")[1], "base64").toString());
    return { role: p.role, ref: p.ref, iss: p.iss, exp: p.exp };
  } catch {
    return { nonJwt: k.slice(0, 8) };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("t") !== "dbg-20260819-jpex") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const pgtestId = "cb43dcf6-0ae3-4fc1-b19d-d23c9b33e27f";

  const usersEq = await supabaseAdmin
    .from("users")
    .select("id, nickname, plan")
    .eq("id", pgtestId)
    .maybeSingle();
  const usersList = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true });
  const coachEmbed = await supabaseAdmin
    .from("coach_chat_sessions")
    .select("id, user_id, users:user_id (nickname, plan)")
    .limit(2);
  const payEmbed = await supabaseAdmin
    .from("payments")
    .select("order_id, users:user_id (nickname)")
    .limit(2);

  return NextResponse.json({
    env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKeyClaims: jwtClaims(process.env.SUPABASE_SERVICE_ROLE_KEY),
      anonKeyClaims: jwtClaims(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    usersEq: { data: usersEq.data, error: usersEq.error?.message ?? null },
    usersCount: { count: usersList.count, error: usersList.error?.message ?? null },
    coachEmbed: { data: coachEmbed.data, error: coachEmbed.error?.message ?? null },
    payEmbed: { data: payEmbed.data, error: payEmbed.error?.message ?? null },
  });
}
