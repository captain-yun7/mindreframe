import Link from "next/link";
import { HeroBanner } from "@/components/hero-banner";

const categories = [
  { key: "all", label: "전체" },
  { key: "essential", label: "필수" },
  { key: "concept", label: "개념" },
  { key: "thought", label: "사고" },
  { key: "fake", label: "가짜생각" },
  { key: "change", label: "변화" },
];

const studyItems = [
  { slug: "100days", category: "essential", title: "기적의 100일 프로그램", desc: "100일간의 생각 훈련 전체 로드맵" },
  { slug: "emotion", category: "concept", title: "감정의 정체", desc: "감정은 신호이지, 나 자체가 아닙니다" },
  { slug: "thought", category: "thought", title: "자동사고란?", desc: "머릿속에 자동으로 떠오르는 생각의 비밀" },
  { slug: "fake-thought", category: "fake", title: "가짜생각(인지왜곡) 16가지", desc: "당신의 뇌가 만들어내는 16가지 사고 오류" },
  { slug: "change", category: "change", title: "생각이 바뀌면 감정이 바뀐다", desc: "CBT의 핵심 원리를 이해하기" },
  { slug: "core-belief", category: "change", title: "핵심신념이란?", desc: "자동사고 아래에 숨어있는 뿌리 깊은 믿음" },
];

export default function StudyPage() {
  return (
    <div>
      <HeroBanner
        title="알고가기"
        subtitle="생각은 곧 '나'가 아니다."
        note="이 한 문장이 왜 중요한지, 100일 동안 무엇을 훈련하는지 쉽고 직관적으로 알아보세요."
      />

      <main className="max-w-[880px] mx-auto px-4 py-6">
        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <span
              key={cat.key}
              className="px-4 py-2 rounded-full text-[13px] font-bold border border-gs-line bg-white text-[#374151] hover:bg-[#f3f4f6] cursor-pointer"
            >
              {cat.label}
            </span>
          ))}
        </div>

        {/* 콘텐츠 카드 */}
        <div className="grid gap-4">
          {studyItems.map((item) => (
            <Link
              key={item.slug}
              href={`/study/${item.slug}`}
              className="block bg-white rounded-[18px] p-5 shadow-gs-card border border-[#e5e7eb] hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#eef2ff] text-[#4338ca] text-[11px] font-bold">
                  {categories.find((c) => c.key === item.category)?.label}
                </span>
                <h3 className="text-[16px] font-[950] tracking-[-0.02em]">
                  {item.title}
                </h3>
              </div>
              <p className="mt-2 text-[13px] text-gs-muted">{item.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
