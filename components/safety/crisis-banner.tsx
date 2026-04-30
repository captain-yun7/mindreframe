"use client";

/**
 * 자해/자살 위기 감지 시 노출되는 영구 안내 배너.
 * 채팅·생각쓰레기통 등에서 위기 키워드가 한 번이라도 감지되면 표시되고,
 * 사용자가 직접 닫지 않으면 유지된다.
 */
interface CrisisBannerProps {
  visible: boolean;
  onDismiss?: () => void;
}

export function CrisisBanner({ visible, onDismiss }: CrisisBannerProps) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      data-testid="crisis-banner"
      className="mb-4 rounded-[14px] border border-[#fecaca] bg-[#fef2f2] p-4 text-[#991b1b]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13.5px] leading-[1.7]">
          <strong className="block text-[14px] font-bold mb-1">
            지금 많이 힘드시죠. 혼자 견디지 마세요.
          </strong>
          전문 상담사와 바로 통화하실 수 있어요.
          <ul className="mt-2 list-disc pl-5 space-y-0.5">
            <li>
              자살예방상담전화{" "}
              <a className="font-bold underline" href="tel:1393">
                1393
              </a>{" "}
              (24시간, 무료)
            </li>
            <li>
              정신건강상담전화{" "}
              <a className="font-bold underline" href="tel:15770199">
                1577-0199
              </a>
            </li>
            <li>
              청소년전화{" "}
              <a className="font-bold underline" href="tel:1388">
                1388
              </a>
            </li>
            <li>
              응급상황{" "}
              <a className="font-bold underline" href="tel:112">
                112
              </a>{" "}
              /{" "}
              <a className="font-bold underline" href="tel:119">
                119
              </a>
            </li>
          </ul>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="닫기"
            className="shrink-0 text-[#991b1b] text-[13px] font-bold opacity-70 hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
