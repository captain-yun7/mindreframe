"use server";

import { db } from "@/lib/db";
import { surveyResponses } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase-server";

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
  const user = await getCurrentUser();
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

  await db.insert(surveyResponses).values({
    userId: user.id,
    channel: input.channel,
    gender: input.gender,
    ageGroup: input.ageGroup,
    concernAreas: [input.program],
    depressionAnswers: input.depressionAnswers,
    depressionScore,
    depressionSeverity: phq9Severity(depressionScore),
    anxietyAnswers: input.anxietyAnswers,
    anxietyScore,
    anxietySeverity: gad7Severity(anxietyScore),
    recommendedTrack,
    completedAt: new Date(),
  });

  return {
    ok: true as const,
    depressionScore,
    anxietyScore,
    recommendedTrack,
  };
}
