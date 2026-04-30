"use client";

import { useState, useTransition } from "react";
import { HeroBanner } from "@/components/hero-banner";
import { addThoughtRecord } from "@/lib/actions/thought-records";
import { useToast } from "@/components/ui/toast";
import { CrisisBanner } from "@/components/safety/crisis-banner";
import { detectCrisis } from "@/lib/cbt/crisis-detection";

interface FieldDef {
  key: "situation" | "thought" | "emotion" | "bodyReaction" | "behavior";
  label: string;
  placeholder: string;
  required: boolean;
  rows: number;
  helper: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "situation",
    label: "① 상황",
    placeholder: "예) 회의에서 발표할 차례가 다가왔다.",
    required: true,
    rows: 2,
    helper: "언제, 어디서, 누구와 — 사실만 적어주세요.",
  },
  {
    key: "thought",
    label: "② 떠오른 생각",
    placeholder: "예) 다들 나를 무시하는 것 같았다.",
    required: false,
    rows: 2,
    helper: "그 순간 머릿속을 스친 자동사고.",
  },
  {
    key: "emotion",
    label: "③ 감정",
    placeholder: "예) 불안 80, 무력감 60",
    required: false,
    rows: 1,
    helper: "감정 이름과 점수(0~100)를 함께 적어보세요.",
  },
  {
    key: "bodyReaction",
    label: "④ 신체 반응",
    placeholder: "예) 가슴이 답답하고 손이 떨렸다.",
    required: false,
    rows: 2,
    helper: "몸으로 느껴진 반응을 그대로.",
  },
  {
    key: "behavior",
    label: "⑤ 행동",
    placeholder: "예) 발표를 짧게 끝내고 자리에 앉았다.",
    required: false,
    rows: 2,
    helper: "그때 한 행동 (또는 하지 못한 행동).",
  },
];

type FormState = Record<FieldDef["key"], string>;

const EMPTY: FormState = {
  situation: "",
  thought: "",
  emotion: "",
  bodyReaction: "",
  behavior: "",
};

export default function TrashPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isPending, startTransition] = useTransition();
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const toast = useToast();

  function update(key: FieldDef["key"], value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.situation.trim()) {
      toast.show("상황은 꼭 적어주세요.", "error");
      return;
    }

    // 5개 필드 합쳐서 위기 키워드 감지
    const combined = [
      form.situation,
      form.thought,
      form.emotion,
      form.bodyReaction,
      form.behavior,
    ].join(" ");
    if (detectCrisis(combined).level === "warn") {
      setShowCrisisBanner(true);
      toast.show("긴급 상담이 필요하시면 1393에 전화해주세요", "error");
    }

    startTransition(async () => {
      const result = await addThoughtRecord({
        situation: form.situation.trim(),
        thought: form.thought.trim(),
        emotion: form.emotion.trim(),
        bodyReaction: form.bodyReaction.trim() || undefined,
        behavior: form.behavior.trim() || undefined,
      });

      if (!result.ok) {
        toast.show(result.error, "error");
        return;
      }
      toast.show("잘 적어주셨어요. 성장방에서 다시 볼 수 있어요.", "success");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      setForm(EMPTY);
    });
  }

  return (
    <div>
      <HeroBanner
        title="생각쓰레기통"
        subtitle="오늘 불안하거나, 우울하거나, 화가 났던 한 사건을 전부 쏟아놓으세요."
        note='생각쓰레기통이 알아서 <b>상황 · 생각 · 감정 · 신체반응 · 행동</b>을 나눠줄게요.'
      />

      <main className="max-w-[720px] mx-auto px-3 py-6">
        <CrisisBanner
          visible={showCrisisBanner}
          onDismiss={() => setShowCrisisBanner(false)}
        />

        <div className="bg-white rounded-[18px] p-4 shadow-gs-card border border-[#e5e7eb]">
          <h2 className="text-[16px] font-semibold mb-1 text-[#111827]">
            왜 생각을 나눌까요?
          </h2>
          <p className="text-[13px] text-[#4b5563] mb-4 leading-[1.6]">
            나누는 순간 <b>생각은 생각으로, 나는 나로</b> 분리됩니다. 쓰면 쓸수록 뇌는
            한 걸음 떨어져 바라봐요. 한 칸이라도 좋으니 적어보세요.
          </p>

          <div className="space-y-4">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`field-${field.key}`}
                  className="block text-[13.5px] font-bold text-[#111827] mb-1"
                >
                  {field.label}
                  {field.required && <span className="text-[#dc2626] ml-1">*</span>}
                </label>
                <p className="text-[12px] text-[#6b7280] mb-1.5">{field.helper}</p>
                {field.rows > 1 ? (
                  <textarea
                    id={`field-${field.key}`}
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.rows}
                    disabled={isPending}
                    className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-[14px] outline-none focus:border-gs-blue resize-y disabled:opacity-50"
                  />
                ) : (
                  <input
                    id={`field-${field.key}`}
                    type="text"
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isPending}
                    className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-[14px] outline-none focus:border-gs-blue disabled:opacity-50"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="mt-5 w-full py-3.5 rounded-full bg-gs-navy-bright text-white font-bold text-[15px] cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "저장 중..." : "쏟아내기"}
          </button>

          {savedAt && (
            <p
              role="status"
              className="mt-3 text-[12.5px] text-[#16a34a] text-center"
            >
              {savedAt} 잘 적어주셨어요. 나중에 성장방에서 다시 볼 수 있어요.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
