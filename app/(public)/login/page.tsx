import type { Metadata } from "next";
import Link from "next/link";
import { SocialLoginButtons } from "./social-login-buttons";

export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return (
    <div className="flex-1 bg-gs-bg flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[520px] p-[34px_28px] rounded-[18px] shadow-[0_18px_40px_rgba(15,23,42,0.10)] text-center">
        <h1 className="text-[22px] font-black mb-2.5">로그인</h1>
        <p className="text-sm text-[#6b7280] leading-[1.7] mb-4">
          소셜 계정으로 빠르게 시작하거나,
          <br />
          닉네임만으로 바로 이용해보실 수 있어요.
        </p>

        <div className="flex flex-col items-center gap-2.5">
          <SocialLoginButtons />

          <div className="flex items-center w-full max-w-[420px] my-1.5 gap-2 text-[#9ca3af] text-[12px]">
            <span className="flex-1 h-px bg-[#e5e7eb]" />
            또는
            <span className="flex-1 h-px bg-[#e5e7eb]" />
          </div>

          <Link
            href="/signup"
            className="w-full max-w-[420px] py-3.5 rounded-full bg-gs-navy-bright text-white font-black text-[16px] text-center block"
          >
            닉네임으로 시작하기
          </Link>
        </div>

        <p className="mt-3.5 text-[13px] text-[#9ca3af]">
          이미 진행 중인 기록은 <b>같은 기기</b>에서 이어집니다.
        </p>
      </div>
    </div>
  );
}
