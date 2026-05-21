"use client";

import Link from "next/link";
import { useState } from "react";

interface DemoMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const DEMO_FLOW: DemoMessage[] = [
  {
    role: "assistant",
    content:
      "안녕하세요! 가짜생각 분석기입니다.\n오늘 힘들었던 상황과 그때 떠오른 생각을 알려주세요.",
  },
  {
    role: "user",
    content: "회의에서 발표할 때 다들 나를 무시하는 것 같았어요. 감정: 불안 80점",
  },
  {
    role: "assistant",
    content:
      "그 상황이 정말 힘드셨겠어요.\n혹시 그때 '다들 나를 무시한다'는 생각이 사실이라는 증거가 있었나요?\n구체적으로 무시하는 말이나 행동이 있었는지 떠올려 보세요.",
  },
  {
    role: "user",
    content: "사실… 그렇게 보이는 사람은 한 명 정도였어요. 다들은 아니었어요.",
  },
  {
    role: "assistant",
    content:
      "잘 짚어주셨어요. '다들'이라고 느꼈던 건 **흑백사고**일 수 있어요.\n대안: \"한 사람의 표정을 모두의 마음으로 확장했구나\" 어떠세요?",
  },
];

const DISTORTIONS = [
  { tag: "흑백사고", desc: "전부 아니면 아예 안 돼" },
  { tag: "독심술", desc: "쟤가 분명히 나를 무시해" },
  { tag: "재앙화", desc: "분명히 최악의 일이 일어날 거야" },
];

export function LandingAnalyzerPreview() {
  const [step, setStep] = useState(2); // 2단계까지 미리 보임
  const visible = DEMO_FLOW.slice(0, step + 1);

  return (
    <div className="w-full rounded-[18px] overflow-hidden border border-gs-line-soft bg-gs-surface-muted">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gs-line-soft bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gs-success" />
          <span className="text-[13px] font-bold">가짜생각 분석기</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gs-blue-soft text-gs-blue-soft-fg">
            미리보기
          </span>
        </div>
        <span className="text-[11px] text-gs-muted">CBT 인지왜곡 분석</span>
      </div>

      {/* 메시지 */}
      <div className="px-3 py-4 space-y-2 min-h-[280px]">
        {visible.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-[14px] text-[13px] leading-[1.6] whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-gs-navy-bright text-white"
                  : "bg-white border border-gs-line-soft text-gs-text-strong"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* 다음 단계 시뮬레이션 버튼 */}
      {step < DEMO_FLOW.length - 1 ? (
        <div className="px-4 py-3 bg-white border-t border-gs-line-soft flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, DEMO_FLOW.length - 1))}
            className="flex-1 py-2.5 rounded-full bg-gs-blue-light border border-gs-blue/35 text-gs-blue text-sm font-bold hover:translate-y-[-1px] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
          >
            다음 응답 보기 ({step + 1} / {DEMO_FLOW.length - 1})
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 bg-gradient-to-br from-gs-blue to-gs-navy-bright text-white">
          <div className="text-[12px] opacity-80 mb-1">
            ✨ 이 대화에서 발견된 인지왜곡
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DISTORTIONS.slice(0, 1).map((d) => (
              <span
                key={d.tag}
                className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold"
              >
                #{d.tag}
              </span>
            ))}
          </div>
          <p className="text-[13px] leading-[1.6] mb-3 opacity-95">
            <b>지금 떠오른 그 생각</b>도 가짜일 수 있어요. 진짜 분석은 회원가입 후
            5분이면 충분해요.
          </p>
          <Link
            href="/signup"
            className="inline-block px-5 py-2.5 rounded-full bg-gs-gold text-gs-text-strong text-sm font-bold hover:brightness-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            내 생각도 분석해보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
