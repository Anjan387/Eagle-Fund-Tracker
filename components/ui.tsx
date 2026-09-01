import type { ComponentProps, ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

type Tone = "neutral" | "brand" | "gold" | "pos" | "neg" | "warn";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  brand: "bg-brand/10 text-brand border-brand/20",
  gold: "bg-gold-soft text-gold border-gold/30",
  pos: "bg-pos-soft text-pos border-pos/25",
  neg: "bg-neg-soft text-neg border-neg/25",
  warn: "bg-warn-soft text-warn border-warn/30",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  const valueTone =
    tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink";
  return (
    <Card className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tnum", valueTone)}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted tnum">{sub}</p> : null}
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const tone = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={cn("tnum font-medium", tone)}>
      {sign}
      {value.toFixed(suffix === "%" ? 1 : 2)}
      {suffix}
    </span>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-neg/25 bg-neg-soft px-3 py-2 text-xs text-neg">
      {children}
    </p>
  );
}

export function FormOk({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-pos/25 bg-pos-soft px-3 py-2 text-xs text-pos">
      {children}
    </p>
  );
}

export const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none";

export const labelClass = "block text-xs font-medium text-muted";

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & {
  pending?: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "bg-brand text-brand-contrast hover:bg-brand-hover",
    ghost: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
    danger: "border border-neg/30 bg-neg-soft text-neg hover:bg-neg/15",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        variants[variant],
        className,
      )}
      disabled={pending || props.disabled}
      {...props}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
