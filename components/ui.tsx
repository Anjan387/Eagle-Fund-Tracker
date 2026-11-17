import type { ComponentProps, ReactNode } from "react";
import { IconArrowDown, IconArrowUp, IconInfo } from "@/components/icons";
import { Today } from "@/components/Today";

// Shared building blocks. Every color, radius and shadow here is a design
// token from app/globals.css, so these restyle with the theme.

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-line bg-surface shadow-card", className)} {...props} />;
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
        <h2 className="text-sm font-semibold tracking-tight text-heading">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * An info icon that shows a note on hover or keyboard focus. Used for the
 * longer explanations that used to sit in page intros.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = `tip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors duration-150 hover:bg-surface-2 hover:text-brand"
      >
        <IconInfo size={16} />
        <span className="sr-only">{label}</span>
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none fixed inset-x-4 top-32 z-30 hidden rounded-md border border-line bg-surface p-3 text-xs font-normal leading-relaxed text-ink shadow-pop group-focus-within:block group-hover:block sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80"
      >
        {children}
      </span>
    </span>
  );
}

/**
 * The slim bar at the top of every page: title (with an optional info note)
 * on the left; any status (the Live pill, a picker) and today's date on the
 * right; a one-line intro underneath.
 */
export function PageHeader({
  title,
  description,
  action,
  info,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  info?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1.5 border-b border-line pb-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-heading">{title}</h1>
          {info ? <InfoTip label={`About ${title}`}>{info}</InfoTip> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {action}
          <Today />
        </div>
      </div>
      {description ? <p className="max-w-3xl text-sm text-muted">{description}</p> : null}
    </header>
  );
}

type Tone = "neutral" | "brand" | "gold" | "pos" | "neg" | "warn";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  brand: "bg-brand/10 text-brand border-brand/20",
  gold: "bg-gold-soft text-gold-ink border-gold/40",
  pos: "bg-pos-soft text-pos border-pos/25",
  neg: "bg-neg-soft text-neg border-neg/25",
  warn: "bg-warn-soft text-warn-ink border-warn/30",
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

/**
 * A KPI card: label, value, sub-line, with the gold top rule. A `trend`
 * adds an up or down arrow beside the value.
 */
export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  trend,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  trend?: "up" | "down";
}) {
  const valueTone = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink";
  return (
    <div className="flex h-full flex-col rounded-lg border border-line border-t-[3px] border-t-gold bg-surface px-5 py-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn("mt-2 flex items-center gap-1 text-[28px] font-semibold leading-tight tracking-tight tnum", valueTone)}>
        {trend === "up" ? <IconArrowUp size={22} strokeWidth={2.4} /> : null}
        {trend === "down" ? <IconArrowDown size={22} strokeWidth={2.4} /> : null}
        {trend ? <span className="sr-only">{trend === "up" ? "Up" : "Down"} </span> : null}
        {value}
      </p>
      {sub ? <p className="mt-auto pt-1.5 text-xs text-muted tnum">{sub}</p> : null}
    </div>
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
  return <p className="rounded-md border border-pos/25 bg-pos-soft px-3 py-2 text-xs text-pos">{children}</p>;
}

export const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors duration-150 focus:border-brand focus:outline-none";

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
        "inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition-colors duration-150 disabled:opacity-60",
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
