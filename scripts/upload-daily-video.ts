#!/usr/bin/env tsx
/**
 * F78 — 일차별 영상을 R2에 업로드 + Supabase notification_videos.video_url 갱신.
 *
 * 사용법:
 *   단일:   npx tsx scripts/upload-daily-video.ts <파일경로> <day_number>
 *   일괄:   npx tsx scripts/upload-daily-video.ts --dir <디렉토리>
 *           (디렉토리 내 "1일차.mp4" / "day-1.mp4" / "1.mp4" 패턴 자동 인식)
 *
 * 필요한 ENV (.env.local 자동 로드):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 객체 키 패턴: `video/day-N.mp4` 고정 (어드민 UI와 동일)
 */

import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { presignR2, readR2Config } from "../lib/video/r2-sigv4";

// .env.local 우선, 그다음 .env
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseDayFromFilename(file: string): number | null {
  const base = path.basename(file);
  // "1일차.mp4" / "day-1.mp4" / "1.mp4"
  const m = base.match(/(?:day[-_])?(\d+)(?:일차)?\.(?:mp4|MP4)$/);
  return m ? Number(m[1]) : null;
}

async function uploadOne(
  filePath: string,
  dayNumber: number,
): Promise<void> {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 100) {
    throw new Error(`day_number 1~100 범위여야 합니다 (got ${dayNumber})`);
  }
  const stat = fs.statSync(filePath);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
  console.log(
    `[${String(dayNumber).padStart(3, " ")}일차] ${path.basename(filePath)} ${sizeMB}MB`,
  );

  const cfg = readR2Config();
  if (!cfg) {
    throw new Error(
      "R2 ENV 미설정 — R2_ACCESS_KEY_ID/SECRET/BUCKET_NAME/ENDPOINT 확인",
    );
  }
  if (!SUPA_URL || !SUPA_SVC) {
    throw new Error(
      "Supabase ENV 미설정 — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인",
    );
  }

  const objectKey = `video/day-${dayNumber}.mp4`;
  const uploadUrl = await presignR2(cfg, "PUT", objectKey, 60 * 30); // 30분

  // Node 20+ fetch — Buffer body 직접 전송 (≤ 1GB는 readFileSync로 충분)
  const body = fs.readFileSync(filePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 PUT 실패 ${res.status} ${text.slice(0, 200)}`);
  }

  const supabaseAdmin = createClient(SUPA_URL, SUPA_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 기존 row 있으면 title 보존, 없으면 기본 title
  const { data: existing } = await supabaseAdmin
    .from("notification_videos")
    .select("title")
    .eq("day_number", dayNumber)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("notification_videos")
    .upsert(
      {
        day_number: dayNumber,
        title: (existing?.title as string | undefined) ?? `${dayNumber}일차 영상`,
        video_url: objectKey,
      },
      { onConflict: "day_number" },
    );
  if (error) {
    throw new Error(`DB 갱신 실패: ${error.message}`);
  }

  console.log(`  ✓ ${objectKey} 등록 완료`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage:\n" +
        "  tsx scripts/upload-daily-video.ts <file> <day>\n" +
        "  tsx scripts/upload-daily-video.ts --dir <directory>",
    );
    process.exit(1);
  }

  if (args[0] === "--dir") {
    const dir = args[1];
    if (!dir) {
      console.error("--dir <directory> 인자가 필요합니다");
      process.exit(1);
    }
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      console.error(`디렉토리를 찾을 수 없습니다: ${dir}`);
      process.exit(1);
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.mp4$/i.test(f));
    const tasks = files
      .map((f) => ({
        file: path.join(dir, f),
        day: parseDayFromFilename(f),
      }))
      .filter((t): t is { file: string; day: number } => t.day != null)
      .sort((a, b) => a.day - b.day);

    if (tasks.length === 0) {
      console.error(
        `업로드 대상이 없습니다 (패턴: "1일차.mp4" / "day-1.mp4" / "1.mp4")`,
      );
      process.exit(1);
    }
    console.log(`총 ${tasks.length}개 업로드 예정 (${dir})\n`);

    const failures: { day: number; err: string }[] = [];
    for (const t of tasks) {
      try {
        await uploadOne(t.file, t.day);
      } catch (e) {
        const msg = (e as Error).message;
        failures.push({ day: t.day, err: msg });
        console.error(`  ✗ ${t.day}일차 — ${msg}`);
      }
    }

    console.log(
      `\n완료: ${tasks.length - failures.length}/${tasks.length} 성공`,
    );
    if (failures.length > 0) {
      console.log(`실패 ${failures.length}건:`);
      failures.forEach((f) =>
        console.log(`  ${String(f.day).padStart(3, " ")}일차 — ${f.err}`),
      );
      process.exit(1);
    }
    return;
  }

  // 단일 모드
  const [file, dayStr] = args;
  if (!file || !dayStr) {
    console.error(
      "Usage: tsx scripts/upload-daily-video.ts <file> <day> | --dir <dir>",
    );
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`파일을 찾을 수 없습니다: ${file}`);
    process.exit(1);
  }
  const day = Number(dayStr);
  await uploadOne(file, day);
}

main().catch((e) => {
  console.error(`\n[ERROR] ${(e as Error).message}`);
  process.exit(1);
});
