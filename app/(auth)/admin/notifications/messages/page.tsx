import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { NOTIFICATION_MESSAGES } from "@/lib/notification-messages";
import { MessagesTable } from "./messages-table";

interface MessageRow {
  day_number: number;
  title: string | null;
  content: string;
}

export default async function AdminNotificationMessagesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("notification_messages")
    .select("day_number, title, content")
    .order("day_number", { ascending: true });

  // 마이그레이션 미적용 환경 fallback
  let rows: MessageRow[];
  let usingFallback = false;
  if (error || !data || data.length === 0) {
    usingFallback = true;
    rows = NOTIFICATION_MESSAGES.map((m) => ({
      day_number: m.day,
      title: null,
      content: m.content,
    }));
  } else {
    rows = data as MessageRow[];
  }

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/notifications" className="text-sm text-gs-blue">
          ← 알림 발송 이력
        </Link>
      </div>
      <PageTitle>알림 메시지 콘텐츠</PageTitle>
      <PageLead>
        100일치 알림 메시지의 본문(<code className="bg-gs-surface-mid px-1 rounded">{`#{content}`}</code>)을
        일차별로 편집합니다. 템플릿 본문은 카카오 검수 통과 형태 고정 — 검수자 사전 고지 권장.
      </PageLead>
      <div className="mt-4 p-3 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-xs text-gs-warn">
        알림톡 변수 정책: 콘텐츠는 동일 카테고리(인지왜곡 훈련) 안에서만 변경. 본문 톤·카테고리 변경
        시 Solapi 콘솔에서 템플릿 재검수가 필요할 수 있습니다.
      </div>
      {usingFallback ? (
        <div className="mt-3 p-3 bg-gs-blue-light border border-gs-blue/25 rounded-[10px] text-xs text-gs-blue">
          notification_messages 테이블이 비어 있어 기본값으로 표시 중입니다. 저장 시 DB에 새 행이
          생성됩니다.
        </div>
      ) : null}
      <div className="mt-4">
        <MessagesTable rows={rows} />
      </div>
    </PageLayout>
  );
}
