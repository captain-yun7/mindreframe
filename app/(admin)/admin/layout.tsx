import { requireAdmin } from "@/lib/auth/admin";
import { AdminChrome } from "./_ui/admin-chrome";

/**
 * 어드민 셸 레이아웃. requireAdmin 가드를 여기서 1회 수행 → 하위 모든 페이지 보호.
 * (admin) 라우트 그룹이라 공개 SiteHeader 없이 사이드바 셸로 렌더된다.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();
  const userName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.nickname as string | undefined) ||
    user.email?.split("@")[0] ||
    "관리자";

  return (
    <AdminChrome userName={userName} userEmail={user.email ?? ""}>
      {children}
    </AdminChrome>
  );
}
