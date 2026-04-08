import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return (
    <div className="flex-1 bg-gs-bg flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[520px] p-[34px_28px] rounded-[18px] shadow-[0_18px_40px_rgba(15,23,42,0.10)] text-center">
        <h1 className="text-[22px] font-black mb-2.5">로그인</h1>
        <p className="text-sm text-[#6b7280] leading-[1.7] mb-4">
          현재는 <b>닉네임으로 바로 시작</b>하는 방식으로 운영 중입니다.
          <br />
          (이메일/비밀번호 로그인은 준비 중입니다.)
        </p>

        <div className="flex flex-col items-center gap-2.5">
          <Link
            href="/signup"
            className="w-full max-w-[420px] py-3.5 rounded-full bg-gs-navy-bright text-white font-black text-[16px] text-center block"
          >
            닉네임으로 시작하기
          </Link>

          <button
            type="button"
            disabled
            className="w-full max-w-[420px] py-3.5 rounded-full bg-[#111827] text-white font-black text-[16px] opacity-60 cursor-not-allowed"
          >
            Google/Apple로 로그인(준비중)
          </button>
        </div>

        <p className="mt-3.5 text-[13px] text-[#9ca3af]">
          이미 진행 중인 기록은 <b>같은 기기</b>에서 이어집니다.
        </p>
      </div>
    </div>
  );
}
