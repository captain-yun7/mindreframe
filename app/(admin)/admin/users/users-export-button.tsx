"use client";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "../_ui/lib/csv";
import { planLabel, roleLabel } from "../_ui/lib/labels";

export interface ExportUserRow {
  email: string;
  nickname: string;
  plan: string | null;
  role: string;
  phone_number: string | null;
  payment_status: string | null;
  plan_expires_at: string | null;
  notifications_started_at: string | null;
  created_at: string;
}

/** 현재 목록(서버에서 받은 rows)을 CSV로 내보내기. */
export function UsersExportButton({ rows }: { rows: ExportUserRow[] }) {
  const handle = () => {
    downloadCsv(
      `users-${new Date().toISOString().slice(0, 10)}`,
      [
        "이메일",
        "닉네임",
        "플랜",
        "권한",
        "휴대폰",
        "결제상태",
        "플랜종료",
        "알림시작",
        "가입일",
      ],
      rows.map((u) => [
        u.email,
        u.nickname,
        planLabel(u.plan),
        roleLabel(u.role),
        u.phone_number ?? "",
        u.payment_status ?? "",
        u.plan_expires_at ? u.plan_expires_at.slice(0, 10) : "",
        u.notifications_started_at ?? "",
        u.created_at.slice(0, 10),
      ]),
    );
  };
  return (
    <Button variant="outline" size="sm" onClick={handle}>
      CSV 내보내기
    </Button>
  );
}
