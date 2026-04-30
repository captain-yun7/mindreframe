import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** 호버 시 그림자 강조 (Link 카드 등 클릭 가능한 카드) */
  interactive?: boolean;
}

/**
 * 가짜생각 공용 카드. 한 종류만 쓴다.
 * - border: gs-line-soft (단일)
 * - radius: 18px (카드 표준), Hero/배지/배너는 별도 처리
 * - shadow: gs-card (단일), interactive=true일 때 hover에서 gs-card-hover
 */
export function Card({ className, children, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-[18px] p-4 border border-gs-line-soft shadow-gs-card",
        interactive && "transition-shadow hover:shadow-gs-card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "m-0 text-[15px] font-[950] tracking-[-0.03em]",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-2 text-gs-muted text-[12.8px] font-[750]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
