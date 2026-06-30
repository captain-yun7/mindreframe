import { PageHeader } from "../../_ui/page-header";
import { BadgeForm } from "../badge-form";

export default function AdminBadgeNewPage() {
  return (
    <div>
      <PageHeader
        title="새 뱃지"
        backHref="/admin/badges"
        backLabel="← 뱃지 목록"
      />
      <BadgeForm mode="create" />
    </div>
  );
}
