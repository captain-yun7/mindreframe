import Image from "next/image";
import { StudyList } from "./study-list";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { STUDY_CORE, STUDY_GROUPS } from "@/lib/study-content"; // fallback
import type { StudyGroup, StudyItem } from "@/lib/study-content";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";

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

export const revalidate = 300;

export default async function StudyPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("study_articles")
    .select("slug, category, title, sub, body_html, order_index")
    .order("order_index", { ascending: true });

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
                <br className="hidden md:block" />
                우울·불안의 원리부터 인지왜곡, 회피, 반추까지 —{" "}
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
          <StudyList core={core} groups={groups} />
        </FadeIn>
      </main>
    </PageFade>
  );
}
