import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card, CardTitle } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { NewUserForm } from "./new-user-form";

export default async function AdminNewUserPage() {
  await requireAdmin();
  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/users" className="text-sm text-gs-blue">
          ← 사용자 목록
        </Link>
      </div>
      <PageTitle>새 사용자 추가</PageTitle>
      <Card className="mt-4">
        <CardTitle>기본 정보</CardTitle>
        <p className="mt-2 text-xs text-gs-muted">
          사용자에게 임시 비밀번호와 로그인 안내를 직접 전달해주세요. 자동 이메일은
          발송되지 않습니다.
        </p>
        <div className="mt-3">
          <NewUserForm />
        </div>
      </Card>
    </PageLayout>
  );
}
