import { HeroBanner } from "@/components/hero-banner";
import { StudyList } from "./study-list";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { STUDY_CORE, STUDY_GROUPS } from "@/lib/study-content"; // fallback
import type { StudyGroup, StudyItem } from "@/lib/study-content";

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
    <div>
      <HeroBanner
        title="알고가기"
        subtitle="알아야 바뀝니다."
        note="우울·불안의 원리부터 인지왜곡, 회피, 반추까지 — 100일 훈련에 필요한 모든 개념을 한 곳에서."
      />

      <main className="max-w-[880px] mx-auto px-4 py-8">
        <StudyList core={core} groups={groups} />
      </main>
    </div>
  );
}
