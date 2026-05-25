import "server-only";

/**
 * 텔레그램 Bot API sendMessage wrapper.
 *
 * ENV (부재 시 graceful skip — throw 안 함):
 *   TELEGRAM_BOT_TOKEN — 봇 토큰
 *
 * chatId 우선순위:
 *   1) 인자로 받은 chatId (예: 매칭 코치의 telegram_chat_id)
 *   2) TELEGRAM_DEFAULT_CHAT_ID ENV (단일 운영자 fallback)
 *
 * 본 함수는 throw하지 않음 — 모든 에러는 콘솔 + return false.
 */
export async function sendTelegramMessage({
  text,
  chatId,
  parseMode = "Markdown",
}: {
  text: string;
  chatId?: string | null;
  parseMode?: "Markdown" | "HTML";
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN 미설정" };
  }
  const targetChatId = chatId ?? process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!targetChatId) {
    return {
      ok: false,
      skipped: true,
      error: "chat_id 부재 (코치 telegram_chat_id + TELEGRAM_DEFAULT_CHAT_ID 모두 미설정)",
    };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (!json.ok) {
      console.error("[telegram] sendMessage failed:", json.description);
      return { ok: false, error: json.description ?? "텔레그램 발송 실패" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[telegram] threw:", msg);
    return { ok: false, error: msg };
  }
}
