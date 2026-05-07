"use client";

import { useState } from "react";
import { HeroBanner } from "@/components/hero-banner";
import { ChatContainer, type ChatMessage } from "@/components/chat/chat-container";
import { addThoughtRecord } from "@/lib/actions/thought-records";
import { useToast } from "@/components/ui/toast";
import { CrisisBanner } from "@/components/safety/crisis-banner";
import { detectCrisis } from "@/lib/cbt/crisis-detection";

type StepKey = "situation" | "thought" | "emotion" | "bodyReaction" | "behavior";

interface Step {
  key: StepKey;
  prompt: string;
}

const STEPS: Step[] = [
  {
    key: "situation",
    prompt:
      "어떤 일이 있었나요?\n언제·어디서·누구와 — 사실만 한 줄로 적어주세요.",
  },
  {
    key: "thought",
    prompt:
      "그때 머릿속에 가장 먼저 떠오른 생각은 무엇이었나요?\n자동사고를 그대로 적어보세요.",
  },
  {
    key: "emotion",
    prompt:
      "그때 어떤 감정이 일어났나요?\n예) 불안 80, 무력감 60 — 감정 이름과 점수(0~100)를 함께.",
  },
  {
    key: "bodyReaction",
    prompt:
      "몸으로 어떤 반응이 느껴졌나요?\n예) 가슴이 답답하고 손이 떨렸다. (없으면 '없음'이라고 적어주세요.)",
  },
  {
    key: "behavior",
    prompt:
      "그때 한 행동(또는 하지 못한 행동)은 무엇인가요?\n예) 발표를 짧게 끝내고 자리에 앉았다. (없으면 '없음'이라고 적어주세요.)",
  },
];

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "안녕하세요. 오늘 마음이 무거웠던 한 사건을 함께 정리해볼까요?\n한 단계씩 짧게 답해주시면 됩니다. 먼저—",
};

export default function TrashPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_MESSAGE,
    { role: "assistant", content: STEPS[0].prompt },
  ]);
  const [stepIndex, setStepIndex] = useState(0);
  const [collected, setCollected] = useState<Record<StepKey, string>>({
    situation: "",
    thought: "",
    emotion: "",
    bodyReaction: "",
    behavior: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  async function handleSend(content: string) {
    if (done) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const currentStep = STEPS[stepIndex];

    // 사용자 답변 저장
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    // 위기 키워드 감지
    if (detectCrisis(trimmed).level === "warn") {
      setShowCrisisBanner(true);
      toast.show("긴급 상담이 필요하시면 1393에 전화해주세요", "error");
    }

    const next = { ...collected, [currentStep.key]: trimmed };
    setCollected(next);

    if (stepIndex < STEPS.length - 1) {
      // 다음 질문
      const nextStep = STEPS[stepIndex + 1];
      setMessages((prev) => [...prev, { role: "assistant", content: nextStep.prompt }]);
      setStepIndex(stepIndex + 1);
      return;
    }

    // 마지막 단계 → 저장
    setIsSaving(true);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "잘 적어주셨어요. 정리해서 성장방에 저장할게요…" },
    ]);

    const norm = (v: string) => (v.toLowerCase() === "없음" ? undefined : v);
    const result = await addThoughtRecord({
      situation: next.situation,
      thought: next.thought || undefined,
      emotion: next.emotion || undefined,
      bodyReaction: norm(next.bodyReaction),
      behavior: norm(next.behavior),
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.show(result.error, "error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `저장에 실패했어요: ${result.error}` },
      ]);
      return;
    }

    toast.show("성장방에 저장되었어요", "success");
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content:
          "📌 정리 완료\n" +
          `• 상황: ${next.situation}\n` +
          `• 생각: ${next.thought || "—"}\n` +
          `• 감정: ${next.emotion || "—"}\n` +
          `• 신체: ${norm(next.bodyReaction) || "—"}\n` +
          `• 행동: ${norm(next.behavior) || "—"}`,
      },
      {
        role: "assistant",
        content:
          "오늘도 한 사건을 잘 분리해주셨어요. 나의성장방에서 다시 볼 수 있어요.",
      },
    ]);
    setDone(true);
  }

  function handleReset() {
    setMessages([INITIAL_MESSAGE, { role: "assistant", content: STEPS[0].prompt }]);
    setStepIndex(0);
    setCollected({
      situation: "",
      thought: "",
      emotion: "",
      bodyReaction: "",
      behavior: "",
    });
    setDone(false);
  }

  return (
    <div>
      <HeroBanner
        title="생각쓰레기통"
        subtitle="오늘 불안하거나, 우울하거나, 화가 났던 한 사건을 전부 쏟아놓으세요."
        note='챗봇이 <b>상황 · 생각 · 감정 · 신체반응 · 행동</b>을 한 단계씩 나눠 받을게요.'
      />

      <main className="max-w-[720px] mx-auto px-3 py-6">
        <CrisisBanner
          visible={showCrisisBanner}
          onDismiss={() => setShowCrisisBanner(false)}
        />

        <div className="bg-white rounded-[18px] p-4 shadow-gs-card border border-gs-line-soft">
          <h2 className="text-base font-semibold mb-1 text-gs-text-strong">왜 생각을 나눌까요?</h2>
          <p className="text-[13px] text-gs-text-soft mb-4 leading-[1.6]">
            나누는 순간 <b>생각은 생각으로, 나는 나로</b> 분리됩니다. 한 줄씩만 적어보세요.
          </p>

          <ChatContainer
            messages={messages}
            onSend={handleSend}
            isLoading={isSaving}
            placeholder={
              done
                ? "정리가 완료되었어요. 다시 시작은 아래 버튼."
                : `${stepIndex + 1} / ${STEPS.length} — 답변을 적어주세요`
            }
            headerTitle="생각쓰레기통"
            headerTag={`${stepIndex + 1} / ${STEPS.length}`}
          />

          {done && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 w-full py-3 rounded-[14px] border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft hover:bg-gs-surface-mid transition-colors"
            >
              다른 사건 또 정리하기
            </button>
          )}

          <p className="mt-3 text-xs text-gs-muted text-center">
            저장된 기록은 나의성장방에서 날짜별로 다시 볼 수 있어요.
          </p>
        </div>
      </main>
    </div>
  );
}
