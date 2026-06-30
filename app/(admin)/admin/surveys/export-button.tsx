"use client";

import { downloadCsv } from "../_ui/lib/csv";

export interface SurveyExportRow {
  created_at: string;
  nickname: string;
  email: string;
  gender: string;
  age_group: string;
  concern_areas: string;
  depression_score: string;
  depression_severity: string;
  anxiety_score: string;
  anxiety_severity: string;
  recommended_track: string;
}

const HEADERS = [
  "응답일",
  "닉네임",
  "이메일",
  "성별",
  "연령대",
  "관심영역",
  "우울점수",
  "우울중증도",
  "불안점수",
  "불안중증도",
  "추천트랙",
];

export function ExportButton({ rows }: { rows: SurveyExportRow[] }) {
  const handleClick = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `survey-responses-${today}`,
      HEADERS,
      rows.map((r) => [
        r.created_at,
        r.nickname,
        r.email,
        r.gender,
        r.age_group,
        r.concern_areas,
        r.depression_score,
        r.depression_severity,
        r.anxiety_score,
        r.anxiety_severity,
        r.recommended_track,
      ]),
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rows.length === 0}
      className="px-4 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      CSV 내보내기
    </button>
  );
}
