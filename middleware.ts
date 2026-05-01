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

  // Plan 가드 — ENV 토글 (베타: PLAN_GATE_ENABLED=false)
  if (user && isPlanGateEnabled()) {
    const required = getRoutePlanRequirement(pathname);
    if (required) {
      const { data: profile } = await supabase
        .from("users")
        .select("plan")
        .eq("id", user.id)
        .single();
      const currentPlan = normalizePlan(profile?.plan);
      if (!planAtLeast(currentPlan, required)) {
        const upgradeUrl = new URL("/pricing", request.url);
        upgradeUrl.searchParams.set("from", pathname);
        upgradeUrl.searchParams.set("required", required);
        return NextResponse.redirect(upgradeUrl);
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
