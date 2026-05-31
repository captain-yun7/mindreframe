"use client";

import { useState, useTransition } from "react";
import { adminSendTestNotification } from "@/lib/actions/admin-notifications";
import { useToast } from "@/components/ui/toast";

/**
 * F240 — 알림톡/SMS 즉시 테스트 발송 폼.
 *  - kind 선택: 알림톡 / SMS
 *  - 알림톡은 templateId + variables(JSON) 입력
 *  - SMS는 text만 입력
 */
export function TestSendForm() {
  const [kind, setKind] = useState<"alimtalk" | "sms">("alimtalk");
  const [phone, setPhone] = useState("");
  const [templateId, setTemplateId] = useState(
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SOLAPI_TEST_TEMPLATE_ID ?? ""
      : "",
  );
  const [variables, setVariables] = useState('{}');
  const [smsText, setSmsText] = useState("[가짜생각 테스트] 알림톡/SMS 발송 테스트입니다.");
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    messageId?: string;
    error?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSend() {
    setLastResult(null);
    startTransition(async () => {
      const r = await adminSendTestNotification({
        kind,
        to: phone,
        text: kind === "sms" ? smsText : undefined,
        templateId: kind === "alimtalk" ? templateId : undefined,
        variables: kind === "alimtalk" ? variables : undefined,
      });
      if (!r.ok) {
        toast.show(r.error, "error");
        setLastResult({ ok: false, error: r.error });
        return;
      }
      toast.show(`발송 완료 (${r.kind})`, "success");
      setLastResult({ ok: true, messageId: r.messageId });
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind("alimtalk")}
          className={`px-3 py-1.5 rounded-[8px] text-xs font-bold ${
            kind === "alimtalk"
              ? "bg-gs-navy-bright text-white"
              : "bg-white border border-gs-line-soft text-gs-text-soft"
          }`}
        >
          카카오 알림톡
        </button>
        <button
          type="button"
          onClick={() => setKind("sms")}
          className={`px-3 py-1.5 rounded-[8px] text-xs font-bold ${
            kind === "sms"
              ? "bg-gs-navy-bright text-white"
              : "bg-white border border-gs-line-soft text-gs-text-soft"
          }`}
        >
          SMS
        </button>
      </div>

      <div>
        <label className="block text-[12px] text-gs-muted mb-1">수신 번호</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01012345678"
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
        />
      </div>

      {kind === "alimtalk" ? (
        <>
          <div>
            <label className="block text-[12px] text-gs-muted mb-1">템플릿 ID</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="검수 통과한 카카오 알림톡 템플릿 ID"
              className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[12px] text-gs-muted mb-1">
              변수 (JSON, 예: {`{"#{name}":"홍길동"}`})
            </label>
            <textarea
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-xs font-mono"
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-[12px] text-gs-muted mb-1">본문 (90byte 초과 시 LMS)</label>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={pending}
        className="w-full py-2.5 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
      >
        {pending ? "발송 중…" : "즉시 발송"}
      </button>

      {lastResult && (
        <div
          className={`text-[12px] p-3 rounded-[10px] ${
            lastResult.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-red-50 border border-red-200 text-red-900"
          }`}
        >
          {lastResult.ok ? (
            <>
              <b>성공.</b> messageId: <code className="font-mono">{lastResult.messageId}</code>
            </>
          ) : (
            <>
              <b>실패.</b> {lastResult.error}
            </>
          )}
        </div>
      )}

      <p className="text-[11px] text-gs-muted">
        ENV 필요: <code>SOLAPI_API_KEY</code> · <code>SOLAPI_API_SECRET</code> ·{" "}
        <code>SOLAPI_PFID</code> (알림톡) · <code>SOLAPI_SENDER</code>
      </p>
    </div>
  );
}
