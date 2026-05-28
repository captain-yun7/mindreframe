import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL_WHITELIST } from "@/lib/auth/plan";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

/**
 * 어드민 별도 로그인 (`/admin/login`).
 *
 * 일반 사용자 `/login`(소셜/익명 닉네임)과 분리. 운영자 전용 이메일/비번 폼.
 * - 이미 로그인 + admin 자격인 경우 즉시 `/admin`으로 redirect
 * - middleware의 PROTECTED_PREFIXES에 `/admin`이 없으므로 미인증자도 접근 가능
 */
export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 어드민 자격이면 바로 `/admin`. 일반 사용자라면 그대로 로그인 폼 노출 — 운영자 계정
    // 재로그인 흐름을 막지 않기 위함.
    const email = user.email ?? "";
    let isAdmin = ADMIN_EMAIL_WHITELIST.includes(email);
    if (!isAdmin) {
      // RLS 세션 이슈에 무관하게 — service role로 role 조회 (있을 때만).
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && serviceKey) {
        const admin = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: profile } = await admin
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        isAdmin = (profile as { role?: string } | null)?.role === "admin";
      }
    }
    if (isAdmin) redirect("/admin");
  }

  return (
    <main className="flex-1 bg-gs-navy-50/40 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[440px]">
        <div className="bg-white rounded-toss-card shadow-toss-card-hover px-8 py-10">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gs-gold/15 text-gs-navy text-xs font-bold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gs-gold" />
              ADMIN
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-gs-navy">
              관리자 로그인
            </h1>
            <p className="mt-2 text-sm text-gs-muted-soft leading-[1.7]">
              운영자 전용 페이지예요.
              <br />
              일반 이용자는 아래 링크로 이동해주세요.
            </p>
          </div>

          <AdminLoginForm />

          <div className="mt-6 pt-5 border-t border-gs-line-soft text-center">
            <Link
              href="/login"
              className="text-xs text-gs-muted-light hover:text-gs-navy transition-colors"
            >
              일반 사용자이신가요? 사용자 로그인 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
