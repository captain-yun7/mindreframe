import { cn } from "@/lib/utils";

const baseInput =
  "w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-gs-blue/40 disabled:opacity-50 disabled:bg-gs-surface-muted";

/** label + 컨트롤 + (옵션) hint/error 래퍼 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="block text-[13px] font-bold text-gs-text-strong mb-1.5">
          {label}
          {required ? <span className="text-gs-danger ml-0.5">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="block text-[12px] text-gs-danger mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-[12px] text-gs-muted mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseInput, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseInput, "min-h-[96px]", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseInput, className)} {...props}>
      {children}
    </select>
  );
}
