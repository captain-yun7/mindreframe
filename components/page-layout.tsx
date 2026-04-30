import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main
      className={cn(
        "max-w-[1120px] mx-auto px-4 pt-6 pb-24",
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
        "mt-2 text-gs-muted text-sm font-[750]",
        className,
      )}
    >
      {children}
    </p>
  );
}
