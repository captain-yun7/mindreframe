"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type SurveyInput = {
  channel: string;
  program: string;
  gender: string;
  ageGroup: string;
  depressionAnswers: number[];
  anxietyAnswers: number[];
};

const phq9Severity = (score: number) => {
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  if (score <= 19) return "moderately_severe";
  return "severe";
};

const gad7Severity = (score: number) => {
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  return "severe";
};

export async function submitSurvey(input: SurveyInput) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다" };
  }

  const depressionScore = input.depressionAnswers.reduce((a, b) => a + b, 0);
  const anxietyScore = input.anxietyAnswers.reduce((a, b) => a + b, 0);

  const recommendedTrack =
    depressionScore > anxietyScore + 2
      ? "depression"
      : anxietyScore > depressionScore + 2
        ? "anxiety"
        : "balanced";

  const { error } = await supabase.from("survey_responses").insert({
    user_id: user.id,
    channel: input.channel,
    gender: input.gender,
    age_group: input.ageGroup,
    concern_areas: [input.program],
    depression_answers: input.depressionAnswers,
    depression_score: depressionScore,
    depression_severity: phq9Severity(depressionScore),
    anxiety_answers: input.anxietyAnswers,
    anxiety_score: anxietyScore,
    anxiety_severity: gad7Severity(anxietyScore),
    recommended_track: recommendedTrack,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    depressionScore,
    anxietyScore,
    recommendedTrack,
  };
}
