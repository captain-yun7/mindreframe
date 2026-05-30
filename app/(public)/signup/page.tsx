import { redirect } from "next/navigation";

/**
 * F234 — 익명(닉네임만) 가입 제거. /signup 진입 시 /login으로 강제 이동.
 * 기존 외부 링크(/signup) 깨짐 방지를 위해 페이지는 유지하고 redirect만.
 */
export default function SignupPage() {
  redirect("/login");
}
