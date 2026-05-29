"use client";

import { useState } from "react";
import Image from "next/image";
import { ChatContainer, type ChatMessage } from "@/components/chat/chat-container";
import { sendTrashMessage, type TrashMsg } from "@/lib/actions/thought-records";
import { useToast } from "@/components/ui/toast";
import { CrisisBanner } from "@/components/safety/crisis-banner";
import { detectCrisis } from "@/lib/cbt/crisis-detection";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { GamePopup } from "@/components/game-popup";
import { QuickNav } from "@/components/quick-nav";

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "오늘 불안하거나, 우울하거나, 화가 났던 순간이 하나라도 떠오르면\n그냥 생각나는 대로 적어요.\n\n문장이 정리가 안 돼도 되고, 감정부터 적어도 돼요.\n그냥 '이래서 힘들었다' 싶은 것부터 하나만 얘기해주세요.",
};

export interface TrashClientProps {
  heroSubtitle?: string;
  popup: { title: string; body: string; cta?: string } | null;
  /** K3·F184 — 진입 시 오늘 사용량 (서버에서 fetch) */
  initialUsage?: { used: number; limit: number; isUnlimited: boolean };
}

export function TrashClient({
  heroSubtitle,
  popup,
  initialUsage,
}: TrashClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [done, setDone] = useState(false);
  const [usedCount, setUsedCount] = useState(initialUsage?.used ?? 0);
  const dailyLimit = initialUsage?.limit ?? 0;
  const isUnlimited = initialUsage?.isUnlimited ?? false;
  const remaining = isUnlimited
    ? null
    : Math.max(0, dailyLimit - usedCount);
  const toast = useToast();

  async function handleSend(content: string) {
    if (done) return;
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    if (detectCrisis(trimmed).level === "warn") {
      setShowCrisisBanner(true);
    }

    const historyForApi: TrashMsg[] = messages
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({ role: m.role, content: m.content }));

    setIsLoading(true);
    const result = await sendTrashMessage({
      history: historyForApi,
      content: trimmed,
    });
    setIsLoading(false);

    if (!result.ok) {
      toast.show(result.error, "error");
      return;
    }

    if (result.crisis) {
      setShowCrisisBanner(true);
      toast.show("긴급 상담이 필요하시면 1393에 전화해주세요", "error");
    }

    setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);

    if (result.saved && result.parsedRecord) {
      const p = result.parsedRecord;
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content:
            "📌 성장방에 저장되었어요\n" +
            `• 상황: ${p.situation ?? "—"}\n` +
            `• 생각: ${p.thought ?? "—"}\n` +
            `• 감정: ${p.emotion_name ?? "—"}${
              typeof p.emotion_intensity === "number"
                ? ` (${p.emotion_intensity}/100)`
                : ""
            }\n` +
            `• 신체: ${p.body_reaction ?? "—"}\n` +
            `• 행동: ${p.behavior ?? "—"}`,
        },
      ]);
      toast.show("성장방에 저장되었어요", "success");
      setDone(true);
      // K3·F184: 정리 저장 = 카운트 1 증가 (서버 incrementUsage와 동기 동기화)
      setUsedCount((prev) => prev + 1);
    }
  }

  function handleReset() {
    setMessages([INITIAL_MESSAGE]);
    setDone(false);
  }

  return (
    <PageFade>
      {/* H4: 첫 진입 팝업 */}
      {popup ? (
        <GamePopup
          storageKey="popup_trash_intro_dismissed_at"
          title={popup.title}
          body={popup.body}
          ctaLabel={popup.cta ?? "시작하기"}
          variant="gold-border"
        />
      ) : null}

      {/* ── HERO ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright">
                  생각쓰레기통
                </div>
                {/* K3·F184 — 오늘 사용 횟수 / 한도 */}
                {dailyLimit > 0 ? (
                  <span
                    data-testid="trash-usage-badge"
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-gs-gold-border px-2.5 py-1 text-[11px] font-extrabold text-gs-navy shadow-toss-card"
                  >
                    {isUnlimited
                      ? `오늘 ${usedCount}회 사용`
                      : `${usedCount}/${dailyLimit} 사용 · ${remaining}회 남음`}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                마음을 비워봐요 ✨
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed whitespace-pre-line">
                {heroSubtitle ??
                  "불안하거나 화가 났던 한 사건을 전부 쏟아놓으세요. 생각쓰레기통이 알아서 상황·생각·감정·신체반응·행동을 나눠줄게요."}
              </p>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/trash-release.svg"
                alt=""
                width={260}
                height={260}
                className="w-[220px] xl:w-[260px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      <main className="max-w-[720px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <CrisisBanner
          visible={showCrisisBanner}
          onDismiss={() => setShowCrisisBanner(false)}
        />

        <FadeIn>
          <div className="rounded-toss-card border-2 border-gs-gold-border bg-[#fff5ec] p-1">
            <div className="bg-white rounded-[18px] p-5 shadow-toss-card">
              <ChatContainer
                messages={messages}
                onSend={handleSend}
                isLoading={isLoading}
                placeholder={
                  done
                    ? "정리가 완료되었어요. 다른 사건은 아래 버튼으로."
                    : "오늘 마음에 남은 한 사건을 떠올려보세요"
                }
                headerTitle="생각쓰레기통"
                headerTag={done ? "정리 완료" : "AI 코치와 대화"}
              />

              {done && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 w-full py-3 rounded-toss-button border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft hover:bg-gs-surface-mid hover:-translate-y-0.5 hover:shadow-toss-card transition-all"
                >
                  다른 사건 또 정리하기
                </button>
              )}

              <p className="mt-3 text-xs text-gs-muted text-center">
                저장된 기록은 나의성장방에서 날짜별로 다시 볼 수 있어요.
              </p>
            </div>
          </div>
        </FadeIn>
        <QuickNav />
      </main>
    </PageFade>
  );
}
