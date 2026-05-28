import Image from "next/image";
import { redirect } from "next/navigation";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  canAccessFeature,
  getCoachWeeklyLimit,
  isAdminUser,
  normalizePlan,
} from "@/lib/auth/plan";
import { getMyCoachThread } from "@/lib/actions/coach-chat";
import { CoachThreadClient } from "./coach-thread-client";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { QuickNav } from "@/components/quick-nav";

export default async function CoachPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // plan / 주간 사용량 / 전체 스레드 병렬 로드 (role도 함께 조회해 운영자 면제 판단)
  const [userRowRes, usedRes, threadRes] = await Promise.all([
    supabase.from("users").select("plan, role").eq("id", user.id).single(),
    supabase.rpc("count_coach_sessions_this_week", { p_user_id: user.id }),
    getMyCoachThread(),
  ]);

  const plan = normalizePlan(userRowRes.data?.plan);
  const isAdmin = isAdminUser(user.email, (userRowRes.data as { role?: string } | null)?.role);

  // 플랜 가드 — coach는 라이트 이상. ENV 토글에 의존하지 않는 다층 방어.
  // 운영자(admin role / 이메일 화이트리스트)는 다른 4개 페이지와 동일하게 면제.
  if (!isAdmin && !canAccessFeature(plan, "coach")) {
    return (
      <PageLayout>
        <PageTitle>코치와 1:1 채팅</PageTitle>
        <PageLead>1:1 코치 채팅은 라이트 이상 플랜에서 이용할 수 있어요.</PageLead>
        <Card className="mt-4 p-6 text-center shadow-toss-card">
          <p className="text-sm text-gs-text-soft mb-4">
            현재 플랜: <b>{plan}</b>
          </p>
          <a
            href="/pricing"
            className="inline-block px-6 py-3 rounded-toss-button bg-gs-gold text-gs-navy font-bold shadow-toss-card hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all"
          >
            플랜 업그레이드
          </a>
        </Card>
      </PageLayout>
    );
  }

  const limit = getCoachWeeklyLimit(plan);
  const used = (usedRes.data as number | null) ?? 0;
  const thread = threadRes.ok
    ? threadRes
    : { sessions: [], messages: [], activeSession: null };

  return (
    <PageFade>
      {/* ── HERO ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                코치와 1:1 채팅
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                함께 이야기해요 🤝
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed">
                궁금한 점·고민을 코치에게 편하게 적어주세요.
                <br className="hidden md:block" />
                <b className="text-gs-text-strong">평일 24시간 이내</b> 답변드려요.
              </p>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/coach-support.svg"
                alt=""
                width={260}
                height={260}
                className="w-[220px] xl:w-[260px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      <main className="max-w-[1120px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <FadeIn>
          <Card className="p-4 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2 shadow-toss-card">
            <div className="text-sm">
              <span className="text-gs-muted">이번 주 사용 </span>
              <b className="text-gs-navy-bright">{used}</b>
              <span className="text-gs-muted"> / {limit}회</span>
            </div>
            <div className="text-xs text-gs-muted">
              1회 = 한 번의 대화 세션 (대화 안에서 메시지 무제한)
            </div>
          </Card>
        </FadeIn>

        <CoachThreadClient
          sessions={thread.sessions}
          initialMessages={thread.messages}
          activeSession={thread.activeSession}
          canStartNew={used < limit}
        />
        <QuickNav />
      </main>
    </PageFade>
  );
}
