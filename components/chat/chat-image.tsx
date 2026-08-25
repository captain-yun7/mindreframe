"use client";

import { useEffect, useState } from "react";
import { getChatImageViewUrl } from "@/lib/actions/chat-images";

/**
 * 코치 채팅 이미지 말풍선. image_key → presigned GET URL을 지연 조회해 표시.
 * 클릭 시 원본을 새 탭으로.
 */
export function ChatImage({ imageKey, localUrl }: { imageKey: string; localUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(localUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (localUrl) return;
    let alive = true;
    getChatImageViewUrl(imageKey).then((r) => {
      if (!alive) return;
      if (r.ok) setUrl(r.url);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [imageKey, localUrl]);

  if (failed) {
    return <span className="text-xs opacity-70">이미지를 불러올 수 없어요</span>;
  }
  if (!url) {
    return (
      <span className="block w-40 h-28 rounded-[10px] bg-black/10 animate-pulse" aria-label="이미지 로딩 중" />
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="첨부 이미지"
        className="max-w-[240px] max-h-[320px] rounded-[10px] object-contain bg-black/5"
        loading="lazy"
      />
    </a>
  );
}

/** 파일 검증 + presigned PUT 업로드. 성공 시 imageKey 반환. */
export async function uploadChatImage(
  sessionId: string,
  file: File,
): Promise<{ ok: true; imageKey: string } | { ok: false; error: string }> {
  const MAX = 10 * 1024 * 1024;
  if (file.size > MAX) return { ok: false, error: "이미지는 10MB 이하만 전송할 수 있어요" };

  const { getChatImageUploadUrl } = await import("@/lib/actions/chat-images");
  const r = await getChatImageUploadUrl(sessionId, file.type);
  if (!r.ok) return r;

  const res = await fetch(r.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) return { ok: false, error: `이미지 업로드 실패 (${res.status})` };
  return { ok: true, imageKey: r.imageKey };
}
