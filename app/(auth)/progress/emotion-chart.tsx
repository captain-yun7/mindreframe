interface Point {
  date: string; // YYYY-MM-DD
  score: number; // 0~100
}

/**
 * 단순 SVG 라인 차트 — 최근 14일 감정 점수.
 * 데이터 1개라도 있으면 점/라인 표시. 0개면 빈 안내.
 */
export function EmotionChart({ points }: { points: Point[] }) {
  if (!points.length) {
    return (
      <div className="mt-4 h-[200px] bg-gs-surface-muted rounded-[14px] flex items-center justify-center text-gs-muted text-[13px]">
        데이터가 쌓이면 감정 변화 그래프가 표시됩니다.
      </div>
    );
  }

  // 14일 슬롯 만들기 (오늘부터 거꾸로)
  const today = new Date();
  const slots: { date: string; label: string; score: number | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const found = points.find((p) => p.date === iso);
    slots.push({
      date: iso,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      score: found ? found.score : null,
    });
  }

  const W = 600;
  const H = 200;
  const PAD_X = 32;
  const PAD_Y = 24;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const xAt = (idx: number) =>
    slots.length > 1 ? PAD_X + (idx / (slots.length - 1)) * innerW : W / 2;
  const yAt = (score: number) =>
    PAD_Y + innerH - (score / 100) * innerH;

  // 점이 있는 슬롯만 연결 (사이의 null 슬롯은 패스)
  const valid = slots.map((s, i) => ({ ...s, idx: i })).filter((s) => s.score !== null);
  const path = valid
    .map((s, i) => `${i === 0 ? "M" : "L"} ${xAt(s.idx)} ${yAt(s.score as number)}`)
    .join(" ");

  return (
    <div className="mt-4 bg-white border border-gs-line-soft rounded-[14px] p-2 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[200px]"
        role="img"
        aria-label="최근 14일 감정 점수 추이"
      >
        {/* 그리드 */}
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
              fill="var(--color-gs-muted, #9ca3af)"
              textAnchor="end"
            >
              {s}
            </text>
          </g>
        ))}

        {/* 라인 */}
        {valid.length > 1 && (
          <path
            d={path}
            fill="none"
            stroke="var(--color-gs-blue, #2563eb)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* 점 */}
        {valid.map((s) => (
          <circle
            key={s.date}
            cx={xAt(s.idx)}
            cy={yAt(s.score as number)}
            r="4"
            fill="var(--color-gs-blue, #2563eb)"
          >
            <title>
              {s.label} · {s.score}점
            </title>
          </circle>
        ))}

        {/* X축 라벨 (3 step) */}
        {slots.map((s, i) =>
          i % 3 === 0 || i === slots.length - 1 ? (
            <text
              key={s.date}
              x={xAt(i)}
              y={H - 6}
              fontSize="10"
              fill="var(--color-gs-muted, #9ca3af)"
              textAnchor="middle"
            >
              {s.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
