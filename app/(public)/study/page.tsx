import { HeroBanner } from "@/components/hero-banner";
import { StudyList } from "./study-list";
import { STUDY_CORE, STUDY_GROUPS } from "@/lib/study-content";

export default function StudyPage() {
  return (
    <div>
      <HeroBanner
        title="알고가기"
        subtitle="알아야 바뀝니다."
        note="우울·불안의 원리부터 인지왜곡, 회피, 반추까지 — 100일 훈련에 필요한 모든 개념을 한 곳에서."
      />

      <main className="max-w-[880px] mx-auto px-4 py-8">
        <StudyList core={STUDY_CORE} groups={STUDY_GROUPS} />
      </main>
    </div>
  );
}
