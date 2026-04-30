"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";

type Provider = "kakao" | "google" | "custom:naver";

const buttons: { provider: Provider; label: string; className: string; logo: React.ReactNode }[] = [
  {
    provider: "kakao",
    label: "카카오로 시작하기",
    className: "bg-[#FEE500] text-[#191919] hover:brightness-95",
    logo: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.78 1.84 5.22 4.6 6.62-.2.7-.72 2.6-.82 3-.13.5.18.5.38.36.16-.1 2.54-1.74 3.58-2.45.74.1 1.5.16 2.26.16 5.52 0 10-3.48 10-7.79C22 6.48 17.52 3 12 3z" />
      </svg>
    ),
  },
  {
    provider: "google",
    label: "Google로 시작하기",
    className: "bg-white text-[#1f1f1f] border border-[#dadce0] hover:bg-[#f8f9fa]",
    logo: (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.7 2.9l5.7-5.6A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.7 1.1 7.7 2.9l5.7-5.6A20 20 0 0 0 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.3c-2 1.5-4.5 2.5-7.3 2.5-5.3 0-9.7-3.4-11.3-8L6.2 33A20 20 0 0 0 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.2 5.3C41 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z" />
      </svg>
    ),
  },
  {
    provider: "custom:naver",
    label: "네이버로 시작하기",
    className: "bg-[#03C75A] text-white hover:brightness-95",
    logo: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z" />
      </svg>
    ),
  },
];

export function SocialLoginButtons() {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const toast = useToast();

  const handleSignIn = async (provider: Provider) => {
    setLoadingProvider(provider);
    const redirectTo = `${window.location.origin}/auth/callback`;

    const scopesByProvider: Partial<Record<Provider, string>> = {
      kakao: "profile_nickname profile_image",
    };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as "kakao" | "google",
      options: {
        redirectTo,
        scopes: scopesByProvider[provider],
      },
    });
    if (error) {
      toast.show(`로그인 실패: ${error.message}`, "error");
      setLoadingProvider(null);
    }
  };

  return (
    <>
      {buttons.map(({ provider, label, className, logo }) => (
        <button
          key={provider}
          type="button"
          onClick={() => handleSignIn(provider)}
          disabled={loadingProvider !== null}
          className={`w-full max-w-[420px] py-3.5 rounded-full font-black text-[16px] flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        >
          {loadingProvider === provider ? "이동 중..." : (
            <>
              {logo}
              {label}
            </>
          )}
        </button>
      ))}
    </>
  );
}
