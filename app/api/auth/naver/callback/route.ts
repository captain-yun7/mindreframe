import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

const NAVER_TOKEN = "https://nid.naver.com/oauth2.0/token";
const NAVER_USERINFO = "https://openapi.naver.com/v1/nid/me";

interface NaverUserinfo {
  resultcode: string;
  message: string;
  response?: {
    id: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
}

function redirectErr(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam || !code || !state) {
    return redirectErr(url.origin, errorParam ?? "naver_no_code");
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("naver_oauth_state")?.value;
  const next = cookieStore.get("naver_oauth_next")?.value ?? "/dashboard";

  if (!savedState || savedState !== state) {
    return redirectErr(url.origin, "naver_invalid_state");
  }

  cookieStore.delete("naver_oauth_state");
  cookieStore.delete("naver_oauth_next");

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectErr(url.origin, "naver_not_configured");
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    state,
  });
  const tokenRes = await fetch(`${NAVER_TOKEN}?${tokenParams.toString()}`, {
    method: "GET",
  });
  if (!tokenRes.ok) {
    return redirectErr(url.origin, "naver_token_failed");
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return redirectErr(url.origin, "naver_no_access_token");
  }

  const userinfoRes = await fetch(NAVER_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userinfoRes.ok) {
    return redirectErr(url.origin, "naver_userinfo_failed");
  }
  const userinfoData = (await userinfoRes.json()) as NaverUserinfo;
  if (userinfoData.resultcode !== "00" || !userinfoData.response) {
    return redirectErr(url.origin, "naver_userinfo_invalid");
  }
  const profile = userinfoData.response;
  const email = profile.email;
  const naverId = profile.id;
  if (!email) {
    return redirectErr(url.origin, "naver_no_email");
  }

  let userId: string | null = null;
  const metadata = {
    full_name: profile.name ?? profile.nickname ?? "",
    avatar_url: profile.profile_image ?? null,
    provider: "naver",
    naver_id: naverId,
  };

  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: metadata,
    });

  if (created?.user) {
    userId = created.user.id;
  } else if (createErr) {
    // 이미 존재하는 이메일 — 기존 사용자 찾기
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const found = list?.users.find((u) => u.email === email);
    if (found) {
      userId = found.id;
      await supabaseAdmin.auth.admin.updateUserById(found.id, {
        user_metadata: {
          ...(found.user_metadata ?? {}),
          provider: found.user_metadata?.provider ?? "naver",
          naver_id: naverId,
        },
      });
    }
  }

  if (!userId) {
    return redirectErr(url.origin, "naver_user_provisioning_failed");
  }

  const { data: linkData, error: linkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

  if (linkErr || !linkData?.properties?.action_link) {
    return redirectErr(url.origin, "naver_link_failed");
  }

  return NextResponse.redirect(linkData.properties.action_link);
}
