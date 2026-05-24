import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getRoutePlanRequirement,
  isPlanGateEnabled,
  normalizePlan,
  planAtLeast,
} from "@/lib/auth/plan";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/trash",
  "/chat",
  "/exercise",
  "/meditation",
  "/progress",
  "/survey",
  "/mypage",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 온보딩 가드 — 닉네임 미설정자는 /onboarding/nickname, 설문 미완료자는 /survey로 강제
  // 통과 경로: /onboarding 본인, /survey 본인, /login, /signup, /pricing, /auth/*, /api/*, 공개 페이지(/, /study)
  if (user) {
    const onboardingExempt =
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/survey") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      pathname === "/" ||
      pathname.startsWith("/study");
    if (!onboardingExempt) {
      const { data: profile } = await supabase
        .from("users")
        .select("onboarding_completed, nickname_set, plan")
        .eq("id", user.id)
        .single();

      // F75 — 닉네임 미설정자는 먼저 /onboarding/nickname으로
      if (profile && !profile.nickname_set) {
        const nickUrl = new URL("/onboarding/nickname", request.url);
        return NextResponse.redirect(nickUrl);
      }

      if (profile && !profile.onboarding_completed) {
        const surveyUrl = new URL("/survey", request.url);
        return NextResponse.redirect(surveyUrl);
      }

      // Plan 가드 — ENV 토글 (베타: PLAN_GATE_ENABLED=false)
      if (isPlanGateEnabled()) {
        const required = getRoutePlanRequirement(pathname);
        if (required) {
          const currentPlan = normalizePlan(profile?.plan);
          if (!planAtLeast(currentPlan, required)) {
            const upgradeUrl = new URL("/pricing", request.url);
            upgradeUrl.searchParams.set("from", pathname);
            upgradeUrl.searchParams.set("required", required);
            return NextResponse.redirect(upgradeUrl);
          }
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
