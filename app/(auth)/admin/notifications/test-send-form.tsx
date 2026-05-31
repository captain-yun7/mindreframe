"use client";

import { useEffect, useState, useTransition } from "react";
import {
  adminSendTestNotification,
  adminListAlimtalkTemplates,
} from "@/lib/actions/admin-notifications";
import { useToast } from "@/components/ui/toast";

/**
 * F240/F242 — 알림톡/SMS 즉시 테스트 발송 폼.
 *  - 알림톡: 등록된 검수 통과 템플릿을 드롭다운에서 선택 → 변수 input 자동 생성
 *  - SMS: 본문만 입력
 */
interface AlimtalkTemplate {
  templateId: string;
  name: string;
  content: string;
  variables: string[];
  status: string;
}

export function TestSendForm() {
  const [kind, setKind] = useState<"alimtalk" | "sms">("alimtalk");
  const [phone, setPhone] = useState("");
  const [templates, setTemplates] = useState<AlimtalkTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [smsText, setSmsText] = useState("[가짜생각 테스트] 알림톡/SMS 발송 테스트입니다.");
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    messageId?: string;
    error?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // 알림톡 탭으로 진입 시 1회 템플릿 목록 fetch
  useEffect(() => {
    if (kind !== "alimtalk" || templates.length > 0) return;
    setTemplatesLoading(true);
    setTemplatesError(null);
    adminListAlimtalkTemplates()
      .then((r) => {
        if (!r.ok) {
          setTemplatesError(r.error);
          return;
        }
        setTemplates(r.templates);
      })
      .finally(() => setTemplatesLoading(false));
  }, [kind, templates.length]);

  const selected = templates.find((t) => t.templateId === selectedId) ?? null;

  function handleSelectTemplate(id: string) {
    setSelectedId(id);
    const t = templates.find((x) => x.templateId === id);
    if (!t) {
      setVariables({});
      return;
    }
    // 변수 input 초기화 — 모두 빈 문자열
    const init: Record<string, string> = {};
    for (const v of t.variables) init[v] = "";
    setVariables(init);
  }

  function handleSend() {
    setLastResult(null);
    startTransition(async () => {
      // 알림톡: variables를 #{name} 키로 변환
      let variablesJson: string | undefined;
      if (kind === "alimtalk") {
        if (!selected) {
          toast.show("템플릿을 선택해주세요", "error");
          return;
        }
        const obj: Record<string, string> = {};
        for (const [k, v] of Object.entries(variables)) {
          obj[`#{${k}}`] = v;
        }
        variablesJson = JSON.stringify(obj);
      }

      const r = await adminSendTestNotification({
        kind,
        to: phone,
        text: kind === "sms" ? smsText : undefined,
        templateId: kind === "alimtalk" ? selectedId : undefined,
        variables: variablesJson,
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

  // 본문 미리보기 — 변수 값으로 치환
  function renderPreview(): string {
    if (!selected) return "";
    let out = selected.content;
    for (const [k, v] of Object.entries(variables)) {
      out = out.split(`#{${k}}`).join(v || `#{${k}}`);
    }
    return out;
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
            <label className="block text-[12px] text-gs-muted mb-1">
              검수 통과 템플릿
            </label>
            {templatesLoading ? (
              <div className="text-xs text-gs-muted py-2">불러오는 중…</div>
            ) : templatesError ? (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-[8px] p-2">
                템플릿 목록 조회 실패: {templatesError}
                <br />
                ENV(<code>SOLAPI_API_KEY</code>, <code>SOLAPI_API_SECRET</code>,{" "}
                <code>SOLAPI_PFID</code>) 확인 후 새로고침.
              </div>
            ) : templates.length === 0 ? (
              <div className="text-xs text-gs-muted">등록된 템플릿이 없어요.</div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm bg-white"
              >
                <option value="">— 템플릿 선택 —</option>
                {templates.map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.name} ({t.templateId.slice(0, 12)}…)
                  </option>
                ))}
              </select>
            )}
          </div>

          {selected && selected.variables.length > 0 && (
            <div>
              <label className="block text-[12px] text-gs-muted mb-1">
                변수 입력
              </label>
              <div className="space-y-2">
                {selected.variables.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <code className="text-[11px] font-mono px-2 py-1 rounded bg-gs-surface-muted shrink-0 min-w-[90px] text-center">
                      #{`{${v}}`}
                    </code>
                    <input
                      type="text"
                      value={variables[v] ?? ""}
                      onChange={(e) =>
                        setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                      }
                      placeholder={`${v} 값`}
                      className="flex-1 px-2 py-1.5 rounded-[8px] border border-gs-line-soft text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected && (
            <div>
              <label className="block text-[12px] text-gs-muted mb-1">
                본문 미리보기
              </label>
              <div className="rounded-[10px] bg-yellow-50 border border-yellow-200 p-3 text-[12.5px] whitespace-pre-wrap leading-[1.6]">
                {renderPreview()}
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <label className="block text-[12px] text-gs-muted mb-1">
            본문 (90byte 초과 시 LMS)
          </label>
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
        disabled={pending || (kind === "alimtalk" && !selectedId)}
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
              <b>성공.</b> messageId:{" "}
              <code className="font-mono">{lastResult.messageId}</code>
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
