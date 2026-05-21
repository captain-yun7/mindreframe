import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const NAVER_AUTHORIZE = "https://nid.naver.com/oauth2.0/authorize";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";

  const clientId = process.env.NAVER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/login?error=naver_not_configured", url.origin),
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
  cookieStore.set("naver_oauth_state", state, cookieOptions);
  cookieStore.set("naver_oauth_next", next, cookieOptions);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${url.origin}/api/auth/naver/callback`,
    state,
  });

  return NextResponse.redirect(`${NAVER_AUTHORIZE}?${params.toString()}`);
}
