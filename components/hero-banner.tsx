import { cn } from "@/lib/utils";

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  note?: string;
  className?: string;
}

export function HeroBanner({
  title,
  subtitle,
  note,
  className,
}: HeroBannerProps) {
  return (
    <section
      className={cn(
        "w-screen relative left-1/2 -ml-[50vw] bg-[radial-gradient(1200px_520px_at_18%_28%,rgba(255,255,255,0.12),rgba(255,255,255,0)_55%),linear-gradient(135deg,#0b2a78_0%,#133ea9_45%,#1f56d6_100%)] px-4 py-[52px] pb-12 text-center",
        className,
      )}
    >
      <h1 className="max-w-[720px] mx-auto text-[50px] max-sm:text-[34px] font-extrabold text-white tracking-[-0.02em] mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="max-w-[720px] mx-auto text-[20px] max-sm:text-[17px] text-white/85 leading-[1.8] mb-2.5 mt-3.5">
          {subtitle}
        </p>
      )}
      {note && (
        <p
          className="max-w-[720px] mx-auto text-[14px] text-white/70"
          dangerouslySetInnerHTML={{ __html: note }}
        />
      )}
    </section>
  );
}
