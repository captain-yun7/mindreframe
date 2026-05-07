import { HeroBanner } from "@/components/hero-banner";
import { StudyList } from "./study-list";
import { listStudyArticles } from "@/lib/study-content";

export default function StudyPage() {
  const items = listStudyArticles();

  return (
    <div>
      <HeroBanner
        title="알고가기"
        subtitle="생각은 곧 '나'가 아니다."
        note="이 한 문장이 왜 중요한지, 100일 동안 무엇을 훈련하는지 쉽고 직관적으로 알아보세요."
      />

      <main className="max-w-[880px] mx-auto px-4 py-8">
        <StudyList items={items} />
      </main>
    </div>
  );
}
