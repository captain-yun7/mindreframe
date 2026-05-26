import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "가짜생각 — 인지행동치료 기반 생각 훈련",
    short_name: "가짜생각",
    description:
      "우울·불안·공황장애의 원인인 왜곡된 생각을 가짜생각 분석기가 찾아 교정하는 인지행동치료 기반 생각 훈련 프로그램",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0e1430",
    orientation: "portrait",
    lang: "ko",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
