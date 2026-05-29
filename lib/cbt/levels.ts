/**
 * J2 / F150·F151 — 명상·감사 레벨 산정.
 * RPC v4와 동일한 공식 (클라이언트 fallback / 표시용).
 *
 * <1=0, <10=1, <30=2, <60=3, 이후 +30마다 +1
 * (60=4, 90=5, 120=6...)
 *
 * 용기 레벨(courage)은 F116 호환 위해 /5 — 별도 함수.
 */

export function level(count: number): number {
  if (count < 1) return 0;
  if (count < 10) return 1;
  if (count < 30) return 2;
  if (count < 60) return 3;
  return 4 + Math.floor((count - 60) / 30);
}

export function courageLevel(count: number): number {
  if (count < 1) return 0;
  return Math.floor((count - 1) / 5) + 1;
}
