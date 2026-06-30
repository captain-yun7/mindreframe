import { PageHeader } from "../../_ui/page-header";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { CouponCreateForm } from "./coupon-create-form";

export default async function AdminCouponNewPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        backHref="/admin/coupons"
        backLabel="← 쿠폰 목록"
        title="새 쿠폰 발행"
      />
      <Card className="mt-6 p-5">
        <CouponCreateForm />
      </Card>
    </>
  );
}
