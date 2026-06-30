import { PageHeader } from "../../_ui/page-header";
import { Card, CardTitle } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { NewUserForm } from "./new-user-form";

export default async function AdminNewUserPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        backHref="/admin/users"
        backLabel="← 사용자 목록"
        title="새 사용자 추가"
      />
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
    </>
  );
}
