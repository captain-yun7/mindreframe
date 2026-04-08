"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");

  function handleStart() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      alert("이름이나 닉네임을 입력해주세요.");
      return;
    }

    // TODO: NextAuth 회원가입 API 연동
    // 현재는 프로토타입과 동일하게 설문 페이지로 이동
    router.push("/survey/intro");
  }

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#0e1430_0%,#1b2f86_45%,#2343e9_100%)] text-white px-6">
      <div className="max-w-[520px] w-full text-center">
        <h1 className="text-[42px] max-[480px]:text-[32px] font-extrabold leading-[1.4] mb-7">
          지금 떠오른 그 생각,
          <br />
          <span className="text-gs-gold">사실일 필요는 없습니다.</span>
        </h1>

        <p className="text-[17px] text-[#e5e7ff] mb-9 leading-[1.6]">
          우울·불안은 성격이 아니라
          <br />
          <b>생각습관</b>입니다.
        </p>

        <div className="flex flex-col gap-3.5">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="어떻게 불러드릴까요?"
            className="w-full py-4 px-[18px] rounded-[14px] border-none text-[16px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          <button
            type="button"
            onClick={handleStart}
            className="py-4 rounded-full border-none text-[17px] font-bold bg-gs-gold text-[#111827] cursor-pointer shadow-[0_10px_30px_rgba(250,204,107,0.4)] hover:brightness-105"
          >
            바로 시작하기
          </button>
        </div>

        <p className="mt-4 text-[13px] text-[#d1d5db]">
          로그인 없이 바로 시작할 수 있어요
        </p>
      </div>
    </div>
  );
}
