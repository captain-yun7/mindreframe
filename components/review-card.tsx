interface ReviewCardProps {
  text: string;
  tag: string;
  gender: "male" | "female";
  gradientId: string;
  gradientColors: [string, string];
  clothColor: string;
  clothStroke: string;
}

function AvatarSvg({
  gender,
  gradientId,
  gradientColors,
  clothColor,
  clothStroke,
}: Omit<ReviewCardProps, "text" | "tag">) {
  const skinColor = gender === "female" ? "#f5c7a9" : "#f2c3a0";

  return (
    <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center bg-white border border-black/10 shadow-[0_10px_22px_rgba(15,23,42,0.10)] overflow-hidden">
      <svg viewBox="0 0 64 64" role="img" aria-hidden="true" className="w-[54px] h-[54px] block">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="0" stopColor={gradientColors[0]} />
            <stop offset="1" stopColor={gradientColors[1]} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="31" fill={`url(#${gradientId})`} opacity="0.18" />
        <circle cx="32" cy="32" r="26" fill="#fff" />
        <path
          d={
            gender === "female"
              ? "M18 28c2-10 10-16 14-16s12 6 14 16c-2-2-6-4-14-4s-12 2-14 4z"
              : "M18 27c2-10 10-15 14-15s12 5 14 15c-3-2-7-3-14-3s-11 1-14 3z"
          }
          fill="#111827"
          opacity="0.9"
        />
        <circle cx="32" cy="30" r="11" fill={skinColor} />
        <path
          d={
            gender === "female"
              ? "M23 29c1-4 4-7 9-7s8 3 9 7c-3-2-6-3-9-3s-6 1-9 3z"
              : "M22 27c2-4 5-6 10-6s8 2 10 6c-4-2-7-2-10-2s-6 0-10 2z"
          }
          fill="#111827"
          opacity="0.92"
        />
        <path d="M18 56c2-10 12-16 14-16s12 6 14 16" fill={clothColor} />
        <path
          d="M18 56c2-10 12-16 14-16s12 6 14 16"
          fill="none"
          stroke={clothStroke}
          opacity="0.15"
        />
      </svg>
    </div>
  );
}

export function ReviewCard(props: ReviewCardProps) {
  const { text, tag, ...avatarProps } = props;

  return (
    <div className="text-center max-w-[880px]">
      <div className="flex items-center justify-center gap-3.5 mb-3.5">
        <AvatarSvg {...avatarProps} />
        <div
          className="text-[20px] tracking-[2px] text-[#fbbf24]"
          style={{ textShadow: "0 2px 10px rgba(251,191,36,0.25)" }}
          aria-label="별점 5점"
        >
          ★★★★★
        </div>
      </div>
      <p className="text-2xl max-sm:text-xl font-extrabold text-gs-text-strong mb-2 leading-[1.5]">
        {text}
      </p>
      <p className="text-base text-gs-text-soft">{tag}</p>
    </div>
  );
}
