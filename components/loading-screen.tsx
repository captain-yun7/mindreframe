import { Card } from "@/components/card";

export function LoadingScreen({
  message = "잠시만요, 데이터를 불러오는 중이에요",
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="p-8 text-center max-w-[420px] w-full">
        <div className="flex justify-center gap-1.5 mb-5" aria-hidden>
          <Dot delay="0s" />
          <Dot delay="0.2s" />
          <Dot delay="0.4s" />
        </div>
        <p className="text-[15px] font-bold text-gs-text-strong">{message}</p>
        {hint && <p className="text-[13px] text-gs-muted mt-2">{hint}</p>}
      </Card>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full bg-gs-blue animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
