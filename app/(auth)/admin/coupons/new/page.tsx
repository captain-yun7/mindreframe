import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { CouponCreateForm } from "./coupon-create-form";

export default async function AdminCouponNewPage() {
  await requireAdmin();
  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/coupons" className="text-sm text-gs-blue">
          ← 쿠폰 목록
        </Link>
      </div>
      <PageTitle>새 쿠폰 발행</PageTitle>
      <Card className="mt-6 p-5">
        <CouponCreateForm />
      </Card>
    </PageLayout>
  );
}
