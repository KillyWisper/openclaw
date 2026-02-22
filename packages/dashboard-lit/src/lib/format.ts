/**
 * Format utilities for the dashboard-lit package.
 *
 * These are inline copies of the shared infra utilities from
 * `src/infra/format-time/format-duration.ts` and `src/infra/format-time/format-relative.ts`,
 * since dashboard-lit is a standalone package that can't import from the monorepo root.
 */

// ---------------------------------------------------------------------------
// formatDurationHuman — from src/infra/format-time/format-duration.ts
// ---------------------------------------------------------------------------

/**
 * Rounded single-unit duration for display: "500ms", "5s", "3m", "2h", "5d".
 * Returns fallback string for null/undefined/non-finite input.
 */
export function formatDurationHuman(ms?: number | null, fallback = "n/a"): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return fallback;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const sec = Math.round(ms / 1000);
  if (sec < 60) {
    return `${sec}s`;
  }
  const min = Math.round(sec / 60);
  if (min < 60) {
    return `${min}m`;
  }
  const hr = Math.round(min / 60);
  if (hr < 24) {
    return `${hr}h`;
  }
  const day = Math.round(hr / 24);
  return `${day}d`;
}

// ---------------------------------------------------------------------------
// formatRelativeTimestamp — from src/infra/format-time/format-relative.ts
// ---------------------------------------------------------------------------

export type FormatRelativeTimestampOptions = {
  /** If true, fall back to short date (e.g. "Oct 5") for timestamps >7 days. Default: false */
  dateFallback?: boolean;
  /** IANA timezone for date fallback display */
  timezone?: string;
  /** Return value for invalid/null input. Default: "n/a" */
  fallback?: string;
};

/**
 * Format an epoch timestamp relative to now.
 *
 * Handles both past ("5m ago") and future ("in 5m") timestamps.
 * Optionally falls back to a short date for timestamps older than 7 days.
 */
export function formatRelativeTimestamp(
  timestampMs: number | null | undefined,
  options?: FormatRelativeTimestampOptions,
): string {
  const fallback = options?.fallback ?? "n/a";
  if (timestampMs == null || !Number.isFinite(timestampMs)) {
    return fallback;
  }

  const diff = Date.now() - timestampMs;
  const absDiff = Math.abs(diff);
  const isPast = diff >= 0;

  const sec = Math.round(absDiff / 1000);
  if (sec < 60) {
    return isPast ? "just now" : "in <1m";
  }

  const min = Math.round(sec / 60);
  if (min < 60) {
    return isPast ? `${min}m ago` : `in ${min}m`;
  }

  const hr = Math.round(min / 60);
  if (hr < 48) {
    return isPast ? `${hr}h ago` : `in ${hr}h`;
  }

  const day = Math.round(hr / 24);
  if (!options?.dateFallback || day <= 7) {
    return isPast ? `${day}d ago` : `in ${day}d`;
  }

  // Fall back to short date display for old timestamps
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      ...(options.timezone ? { timeZone: options.timezone } : {}),
    }).format(new Date(timestampMs));
  } catch {
    return `${day}d ago`;
  }
}

// ---------------------------------------------------------------------------
// formatCost — dollar-formatted cost string
// ---------------------------------------------------------------------------

export function formatCost(cost: number | null | undefined, fallback = "$0.00"): string {
  if (cost == null || !Number.isFinite(cost)) {
    return fallback;
  }
  if (cost === 0) {
    return "$0.00";
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// formatTokens — compact token count display
// ---------------------------------------------------------------------------

export function formatTokens(tokens: number | null | undefined, fallback = "0"): string {
  if (tokens == null || !Number.isFinite(tokens)) {
    return fallback;
  }
  if (tokens < 1000) {
    return String(Math.round(tokens));
  }
  if (tokens < 1_000_000) {
    const k = tokens / 1000;
    return k < 10 ? `${k.toFixed(1)}k` : `${Math.round(k)}k`;
  }
  const m = tokens / 1_000_000;
  return m < 10 ? `${m.toFixed(1)}M` : `${Math.round(m)}M`;
}

// ---------------------------------------------------------------------------
// formatSchedule — human-readable cron schedule description
// ---------------------------------------------------------------------------

type CronScheduleShape =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number }
  | { kind: "cron"; expr: string; tz?: string };

export function formatSchedule(schedule: CronScheduleShape): string {
  if (schedule.kind === "at") {
    try {
      const d = new Date(schedule.at);
      return `at ${d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
    } catch {
      return `at ${schedule.at}`;
    }
  }
  if (schedule.kind === "every") {
    return `every ${formatDurationHuman(schedule.everyMs)}`;
  }
  const base = schedule.tz ? `cron ${schedule.expr} @ ${schedule.tz}` : `cron ${schedule.expr}`;
  return base;
}

// ---------------------------------------------------------------------------
// maskPhoneNumbers — redact phone numbers for privacy mode
// ---------------------------------------------------------------------------

const PHONE_RE = /(\+?\d[\d\s\-().]{6,}\d)/g;

export function maskPhoneNumbers(text: string): string {
  return text.replace(PHONE_RE, "•••-••••-••••");
}

// ---------------------------------------------------------------------------
// formatPercent — percentage display
// ---------------------------------------------------------------------------

export function formatPercent(value: number | null | undefined, fallback = "—"): string {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }
  return `${(value * 100).toFixed(1)}%`;
}
