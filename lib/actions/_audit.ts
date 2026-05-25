import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 어드민 위험 액션 감사 로그. 본 액션의 성공 여부와 분리 (best-effort write).
 * admin_audit_logs 테이블이 없거나 INSERT 실패해도 main 액션은 계속 진행한다.
 */
export async function writeAudit(input: {
  adminUserId: string;
  action: string;
  targetUserId?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  try {
    const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
      admin_user_id: input.adminUserId,
      action: input.action,
      target_user_id: input.targetUserId ?? null,
      payload: input.payload ?? null,
    });
    if (error) {
      console.error("[writeAudit]", input.action, error.message);
    }
  } catch (err) {
    console.error("[writeAudit] threw:", err);
  }
}
