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
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("onboarding_completed, nickname_set, plan")
        .eq("id", user.id)
        .single();

      // F75 fallback — nickname_set 컬럼이 DB에 없는 환경(마이그레이션 미적용)에서는
      // 운영 중단 대신 신규 onboarding 가드만 일시 비활성. SQL 적용되면 자동 정상 동작.
      // 다른 PostgrestError는 일단 통과시키되 로그 — 기존 사용자 차단 막기 위함.
      const columnMissing =
        profileError &&
        (profileError.code === "42703" ||
          /column .*nickname_set.* does not exist/i.test(profileError.message));
      if (profileError) {
        console.error("[middleware] profile fetch error:", profileError);
      }

      // F75 — 닉네임 미설정자는 먼저 /onboarding/nickname으로
      // 컬럼 없음(fallback) 시에는 기존 사용자로 간주 → 닉네임 가드 스킵
      if (!columnMissing && profile && !profile.nickname_set) {
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
