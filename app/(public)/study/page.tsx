import Image from "next/image";
import { StudyList } from "./study-list";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { STUDY_CORE, STUDY_GROUPS } from "@/lib/study-content"; // fallback
import type { StudyGroup, StudyItem } from "@/lib/study-content";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { RoutineVideoGrid } from "@/components/study/routine-video-grid";
import { getRoutineVideosBatch } from "@/lib/actions/study-videos";
import { normalizePlan, planAtLeast, type Plan } from "@/lib/auth/plan";

const GROUP_TITLES: Record<string, string> = {
  distortion: "인지왜곡(통일 명칭)",
  body: "불안과 몸",
  avoidance: "회피와 행동",
  rumination: "반추는 소의 되새김질",
};

const GROUP_KEYS: Array<"distortion" | "body" | "avoidance" | "rumination"> = [
  "distortion",
  "body",
  "avoidance",
  "rumination",
];

// user plan을 cookie 기반으로 매번 조회하므로 동적 렌더링.
export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("study_articles")
    .select("slug, category, title, sub, body_html, order_index")
    .order("order_index", { ascending: true });

  // 현재 사용자 plan — 필수영상 1·2 잠금 여부 결정용
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let currentPlan: Plan = "free";
  if (user) {
    const { data: u } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    currentPlan = normalizePlan((u as { plan?: string } | null)?.plan);
  }
  const introUnlocked = planAtLeast(currentPlan, "light");

  // 100일 루틴 영상 초기 batch
  const initialRoutineBatch = await getRoutineVideosBatch(0, 20);

  let core: StudyItem[];
  let groups: StudyGroup[];

  if (error || !data || data.length === 0) {
    // 마이그레이션 미적용 시 코드 박힘 fallback
    core = STUDY_CORE;
    groups = STUDY_GROUPS;
  } else {
    const all = data.map((r) => ({
      slug: r.slug as string,
      title: r.title as string,
      sub: (r.sub as string | null) ?? "",
      body: r.body_html as string,
      category: r.category as string,
    }));
    const strip = (a: { category: string } & StudyItem): StudyItem => ({
      slug: a.slug,
      title: a.title,
      sub: a.sub,
      body: a.body,
    });
    core = all.filter((a) => a.category === "core").map(strip);
    groups = GROUP_KEYS.map((key) => ({
      key,
      title: GROUP_TITLES[key],
      items: all.filter((a) => a.category === key).map(strip),
    }));
  }

  return (
    <PageFade>
      {/* ── HERO ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                알고가기
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                오늘 알고가요 📚
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed">
                알아야 바뀝니다.
                <br />
                우울·불안의 원리부터 인지왜곡, 회피, 반추까지 —
                <br />
                <b className="text-gs-text-strong">100일 훈련에 필요한 모든 개념</b>을 한 곳에서.
              </p>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/study-learning.svg"
                alt=""
                width={260}
                height={260}
                className="w-[220px] xl:w-[260px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      <main className="max-w-[960px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <FadeIn>
          <StudyList
            core={core}
            groups={groups}
            introUnlocked={introUnlocked}
          />
        </FadeIn>

        <FadeIn>
          <section className="mt-14">
            <header className="mb-4">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
                100일 루틴 3분 영상
              </h2>
              <p className="text-[13px] text-gs-muted mt-1">
                매일 3분, 1일차부터 100일차까지 — 누구나 시청할 수 있어요
              </p>
            </header>
            <RoutineVideoGrid
              initialItems={initialRoutineBatch.items}
              initialNextOffset={initialRoutineBatch.nextOffset}
            />
          </section>
        </FadeIn>
      </main>
    </PageFade>
  );
}
