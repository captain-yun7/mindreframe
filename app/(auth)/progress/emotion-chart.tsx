"use client";

import { useState } from "react";

interface Point {
  date: string; // YYYY-MM-DD or ISO timestamp
  score: number; // 0~100
}

type WindowKey = "14d" | "all";

function toDayString(raw: string): string {
  // raw가 'YYYY-MM-DD'이거나 ISO timestamp 둘 다 처리
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/**
 * 감정 점수 라인 차트. windowKey 토글로 최근 14일/전체 기간 표시.
 * F118: 전체 기간 모드는 첫 데이터 점부터 오늘까지 동적 슬롯.
 */
export function EmotionChart({ points }: { points: Point[] }) {
  const [windowKey, setWindowKey] = useState<WindowKey>("14d");

  if (!points.length) {
    return (
      <div className="mt-4 h-[200px] bg-gs-navy-50/60 rounded-toss-card flex items-center justify-center text-gs-muted-soft text-[13px]">
        데이터가 쌓이면 감정 변화 그래프가 표시됩니다.
      </div>
    );
  }

  const normalized = points.map((p) => ({
    date: toDayString(p.date),
    score: p.score,
  }));
  const dateMap = new Map<string, number>();
  for (const p of normalized) dateMap.set(p.date, p.score);

  // 토글 라벨용 — 전체 기간이 14일 미만이면 "전체" 옵션 비활성
  const sortedDates = [...new Set(normalized.map((p) => p.date))].sort();
  const firstDate = sortedDates[0];

  const today = new Date();
  const slots: { date: string; label: string; score: number | null }[] = [];

  if (windowKey === "14d" || !firstDate) {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      slots.push({
        date: iso,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        score: dateMap.get(iso) ?? null,
      });
    }
  } else {
    // 전체 기간 — first부터 today까지 일별 (성능: max 365 cap)
    const first = new Date(firstDate);
    const todayIso = today.toISOString().slice(0, 10);
    let days = Math.floor(
      (today.getTime() - first.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
    days = Math.max(1, Math.min(days, 365));
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      slots.push({
        date: iso,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        score: dateMap.get(iso) ?? null,
      });
      if (iso === todayIso) break;
    }
  }

  const W = 600;
  const H = 200;
  const PAD_X = 32;
  const PAD_Y = 24;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const xAt = (idx: number) =>
    slots.length > 1 ? PAD_X + (idx / (slots.length - 1)) * innerW : W / 2;
  const yAt = (score: number) => PAD_Y + innerH - (score / 100) * innerH;

  const valid = slots.map((s, i) => ({ ...s, idx: i })).filter((s) => s.score !== null);
  const path = valid
    .map((s, i) => `${i === 0 ? "M" : "L"} ${xAt(s.idx)} ${yAt(s.score as number)}`)
    .join(" ");

  const areaPath =
    valid.length > 1
      ? `${path} L ${xAt(valid[valid.length - 1].idx)} ${yAt(0)} L ${xAt(valid[0].idx)} ${yAt(0)} Z`
      : "";

  // X축 라벨 — slot 길이에 비례한 step (8~12 라벨)
  const labelStep = Math.max(1, Math.floor(slots.length / 8));

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => setWindowKey("14d")}
          className={`px-3 py-1 rounded-full text-[12px] font-bold border transition-colors ${
            windowKey === "14d"
              ? "bg-gs-navy-bright text-white border-gs-navy-bright"
              : "bg-white text-gs-text-soft border-gs-line-soft hover:bg-gs-surface-mid"
          }`}
        >
          최근 14일
        </button>
        <button
          type="button"
          onClick={() => setWindowKey("all")}
          className={`px-3 py-1 rounded-full text-[12px] font-bold border transition-colors ${
            windowKey === "all"
              ? "bg-gs-navy-bright text-white border-gs-navy-bright"
              : "bg-white text-gs-text-soft border-gs-line-soft hover:bg-gs-surface-mid"
          }`}
        >
          전체 기간
        </button>
      </div>
      <div className="bg-white border border-gs-line-soft rounded-toss-card p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[200px]"
          role="img"
          aria-label={`${windowKey === "14d" ? "최근 14일" : "전체 기간"} 감정 점수 추이`}
        >
          <defs>
            <linearGradient id="emotionArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2343e9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2343e9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((s) => (
            <g key={s}>
              <line
                x1={PAD_X}
                x2={W - PAD_X}
                y1={yAt(s)}
                y2={yAt(s)}
                stroke="var(--color-gs-line-soft, #e5e7eb)"
                strokeWidth="1"
                strokeDasharray={s === 50 ? "0" : "3 3"}
              />
              <text
                x={PAD_X - 6}
                y={yAt(s) + 4}
                fontSize="10"
                fill="var(--color-gs-muted-soft, #6b7280)"
                textAnchor="end"
              >
                {s}
              </text>
            </g>
          ))}

          {valid.length > 1 && <path d={areaPath} fill="url(#emotionArea)" />}

          {valid.length > 1 && (
            <path
              d={path}
              fill="none"
              stroke="#2343e9"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {valid.map((s) => (
            <g key={s.date}>
              <circle
                cx={xAt(s.idx)}
                cy={yAt(s.score as number)}
                r="5"
                fill="white"
                stroke="#2343e9"
                strokeWidth="2"
              />
              <circle
                cx={xAt(s.idx)}
                cy={yAt(s.score as number)}
                r="2"
                fill="#facc6b"
              >
                <title>
                  {s.label} · {s.score}점
                </title>
              </circle>
            </g>
          ))}

          {slots.map((s, i) =>
            i % labelStep === 0 || i === slots.length - 1 ? (
              <text
                key={s.date}
                x={xAt(i)}
                y={H - 6}
                fontSize="10"
                fill="var(--color-gs-muted-soft, #6b7280)"
                textAnchor="middle"
              >
                {s.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}
