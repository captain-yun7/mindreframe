import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

/**
 * F250 — Open Graph 이미지 자동 생성 (1200x630).
 * 빌드 시 Next.js가 `/opengraph-image` URL로 PNG 생성.
 * 카카오/페이스북/트위터 등 모든 소셜 공유 미리보기에 사용됨.
 *
 * 가이드: _docs/runbook/seo.md
 */

export const runtime = "nodejs";
export const alt = "가짜생각 — 인지행동치료 기반 생각 훈련";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logoBuffer = await readFile(path.join(process.cwd(), "public/logo.png"));
  const logoBase64 = logoBuffer.toString("base64");
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0e1430 0%, #1a2547 50%, #2a3970 100%)",
          padding: "60px 80px",
          gap: 60,
        }}
      >
        {/* 로고 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUrl}
          alt="가짜생각"
          width={280}
          height={280}
          style={{ borderRadius: 40, flexShrink: 0 }}
        />

        {/* 텍스트 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.05em",
              lineHeight: 1,
            }}
          >
            가짜생각
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#facc6b",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginTop: 12,
            }}
          >
            인지행동치료 기반 생각 훈련
          </div>
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.7)",
              marginTop: 24,
              letterSpacing: "-0.01em",
            }}
          >
            짧게 · 매일 · 쉽게 — 6가지 도구
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
