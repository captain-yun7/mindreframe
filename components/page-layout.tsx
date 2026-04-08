import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main
      className={cn(
        "max-w-[1120px] mx-auto px-4 py-[22px] pb-[90px]",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "m-0 text-2xl font-[950] tracking-[-0.04em]",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function PageLead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-2.5 text-gs-muted text-[13.5px] font-[750]",
        className,
      )}
    >
      {children}
    </p>
  );
}
