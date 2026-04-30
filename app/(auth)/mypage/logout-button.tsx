"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";

export function LogoutButton() {
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      onClick={async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          toast.show(error.message, "error");
          return;
        }
        router.push("/login");
        router.refresh();
      }}
      className="w-full py-3 rounded-[14px] border border-gs-danger-border bg-gs-danger-bg text-sm font-bold text-gs-danger cursor-pointer hover:bg-gs-danger-border transition-colors"
    >
      로그아웃
    </button>
  );
}
