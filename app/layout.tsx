import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

// F250 — SEO metadata 풀셋. 가이드: _docs/runbook/seo.md
const SITE_URL = "https://www.mindreframe.net";
const SITE_NAME = "가짜생각";
const SITE_DESCRIPTION =
  "우울·불안·공황장애의 원인인 왜곡된 생각을 가짜생각 분석기가 찾아 교정하는 인지행동치료(CBT) 기반 생각 훈련 프로그램";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — 인지행동치료 기반 생각 훈련`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "인지행동치료",
    "CBT",
    "우울증",
    "불안장애",
    "공황장애",
    "자동사고",
    "인지왜곡",
    "생각 훈련",
    "마음챙김",
    "감사일기",
    "명상",
    "가짜생각",
  ],
  authors: [{ name: "마인드시어터" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — 인지행동치료 기반 생각 훈련`,
    description: SITE_DESCRIPTION,
    // images는 app/opengraph-image.tsx가 자동으로 추가 — 별도 명시 불필요
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — 인지행동치료 기반 생각 훈련`,
    description: SITE_DESCRIPTION,
    // images는 app/twitter-image.tsx (또는 opengraph-image fallback)이 자동 추가
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e1430",
  // F128/F133 — iOS Safari 노치/홈 indicator safe-area 활용
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
