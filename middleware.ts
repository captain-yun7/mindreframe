import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  getRoutePlanRequirement,
  isPlanGateEnabled,
  normalizePlan,
  planAtLeast,
} from "@/lib/auth/plan";

/**
 * middleware의 supabase 클라이언트는 anon key + 세션 쿠키 기반 → RLS 적용.
 * 세션 토큰 만료·sync 실패 시 본인 row select 차단 → profile null → plan 인식 못함.
 * 해결: profile fetch만 service role로 (auth.getUser는 그대로 anon — JWT decode).
 */
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

  // F141 — `/admin/login`은 운영자 로그인 페이지. 누구나 접근 가능해야 하므로
  // 모든 가드(인증/온보딩/플랜) 면제. PROTECTED_PREFIXES에 `/admin`이 추가될
  // 미래 변경에도 안전하도록 가장 먼저 분기.
  if (pathname === "/admin/login") {
    return response;
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 온보딩 가드 — 닉네임 미설정자는 /onboarding/nickname, 설문 미완료자는 /survey로 강제
  // 통과 경로: /onboarding 본인, /survey 본인, /login, /signup, /pricing, /auth/*, /api/*, /admin, 공개 페이지(/, /study)
  if (user) {
    const onboardingExempt =
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/survey") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/admin") ||
      pathname === "/" ||
      pathname.startsWith("/study");
    if (!onboardingExempt) {
      // RLS 우회 — service role로 본인 row fetch. 세션·쿠키 sync 이슈에 무관 안전.
      // service role 미설정 환경에서는 기존 anon 클라이언트로 fallback.
      const adminClient = createServiceRoleClient();
      const fetchClient = adminClient ?? supabase;
      const { data: profile, error: profileError } = await fetchClient
        .from("users")
        .select("onboarding_completed, nickname_set, plan, role, deleted_at")
        .eq("id", user.id)
        .single();

      // F75 fallback — nickname_set / deleted_at 컬럼이 DB에 없는 환경(마이그레이션 미적용)에서는
      // 운영 중단 대신 신규 가드만 일시 비활성. SQL 적용되면 자동 정상 동작.
      // 다른 PostgrestError는 일단 통과시키되 로그 — 기존 사용자 차단 막기 위함.
      const columnMissing =
        profileError &&
        (profileError.code === "42703" ||
          /column .* does not exist/i.test(profileError.message));
      if (profileError) {
        console.error("[middleware] profile fetch error:", profileError);
      }

      // F71 — 소프트 삭제된 사용자는 즉시 로그아웃 후 /login으로
      const deletedAt = (profile as { deleted_at?: string | null } | null)?.deleted_at;
      if (!columnMissing && deletedAt) {
        await supabase.auth.signOut();
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }

      // ADMIN_BYPASS — admin role은 onboarding/nickname/plan 가드 모두 면제.
      // 운영자가 본인 계정으로 모든 페이지를 점검할 수 있도록 함.
      // 이메일 화이트리스트는 DB role과 무관하게 admin 인식 보장 (세션/RLS 안전망)
      const ADMIN_EMAILS = ["mindtheater00@gmail.com"];
      const userRole = (profile as { role?: string } | null)?.role;
      if (
        userRole === "admin" ||
        (user.email && ADMIN_EMAILS.includes(user.email))
      ) {
        return response;
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
