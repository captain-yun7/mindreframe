import "server-only";
import { createHmac, randomBytes } from "crypto";

/**
 * Solapi(구 NHN Solapi) 알림톡 발송 클라이언트.
 *
 * ENV:
 *   SOLAPI_API_KEY        — Solapi 콘솔의 API Key
 *   SOLAPI_API_SECRET     — API Secret
 *   SOLAPI_PFID           — 카카오 비즈메시지 발신 프로필 ID
 *   SOLAPI_ALIMTALK_TEMPLATE_ID — 검수 통과한 알림톡 템플릿 ID
 *   SOLAPI_SENDER         — 발신 전화번호 (사업자 등록 번호)
 *
 * 인증 방식: HMAC-SHA256 (날짜+salt 기반)
 * 문서: https://developers.solapi.com/references/authentication
 */

const SOLAPI_BASE = "https://api.solapi.com";

function authHeader() {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("SOLAPI_API_KEY/SECRET 미설정");

  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

interface SendAlimtalkInput {
  to: string;                 // 수신 전화번호 (01012345678 형식)
  templateId: string;         // 카카오 알림톡 템플릿 ID
  variables: Record<string, string>; // 템플릿 변수 (#{day}, #{content} 등)
}

interface SendAlimtalkResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 일반 SMS 발송 — 검수 불필요. 카톡 답변 알림 등 즉시성 알림에 사용.
 * 90byte 초과 시 자동 LMS 전환.
 */
export async function sendSms({
  to,
  text,
}: {
  to: string;
  text: string;
}): Promise<SendAlimtalkResult> {
  const sender = process.env.SOLAPI_SENDER;
  if (!sender) return { ok: false, error: "SOLAPI_SENDER 미설정" };

  const body = { message: { to, from: sender, text } };

  try {
    const res = await fetch(`${SOLAPI_BASE}/messages/v4/send`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      messageId?: string;
      errorCode?: string;
      errorMessage?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: `${data.errorCode ?? res.status} ${data.errorMessage ?? "SMS 발송 실패"}`,
      };
    }
    return { ok: true, messageId: data.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false, error: `network: ${msg}` };
  }
}

export async function sendAlimtalk({
  to,
  templateId,
  variables,
}: SendAlimtalkInput): Promise<SendAlimtalkResult> {
  const pfId = process.env.SOLAPI_PFID;
  const sender = process.env.SOLAPI_SENDER;
  if (!pfId || !sender) {
    return { ok: false, error: "SOLAPI_PFID/SENDER 미설정" };
  }

  const body = {
    message: {
      to,
      from: sender,
      kakaoOptions: {
        pfId,
        templateId,
        variables,
      },
    },
  };

  try {
    const res = await fetch(`${SOLAPI_BASE}/messages/v4/send`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      messageId?: string;
      errorCode?: string;
      errorMessage?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: `${data.errorCode ?? res.status} ${data.errorMessage ?? "발송 실패"}`,
      };
    }
    return { ok: true, messageId: data.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false, error: `network: ${msg}` };
  }
}
