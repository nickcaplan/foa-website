export type Shift = { endsAt: string; open: number };
export type Activity = { name?: string; rows?: Shift[]; checkedAt?: string; unavailable?: boolean };
export type Snapshot = { schema?: number; preview?: boolean; activities?: Record<string, Activity> };
/** Return open helper places for ongoing/upcoming shifts, or null for untrusted/stale data. */
export function remaining(activity: Activity | undefined, now: number): number | null {
  const checked = Date.parse(activity?.checkedAt || "");
  if (!activity || activity.unavailable || !Number.isFinite(checked) || checked > now + 60000 || now - checked > 90 * 60000 || !activity.rows?.length) return null;
  let total = 0;
  for (const row of activity.rows) {
    const end = Date.parse(row.endsAt);
    if (!Number.isFinite(end) || !Number.isInteger(row.open) || row.open < 0 || row.open > 20) return null;
    if (end > now) total += row.open;
  }
  return total;
}

/** Rank validated totals descending; unknown totals follow known totals, ties stay stable. */
export function compareRemaining(a: number | null, b: number | null): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return b - a;
}

/** Validate nested published data before replacing the last usable snapshot. */
export function isSnapshot(value: unknown): value is Snapshot {
  const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  if (!record(value) || value.schema !== 1 || !record(value.activities)) return false;
  return Object.values(value.activities).every(activity => {
    if (!record(activity)) return false;
    if (activity.unavailable === true) return true;
    return typeof activity.checkedAt === "string" && Number.isFinite(Date.parse(activity.checkedAt)) && Array.isArray(activity.rows) && activity.rows.length > 0 && activity.rows.every(row => record(row) && typeof row.endsAt === "string" && Number.isFinite(Date.parse(row.endsAt)) && typeof row.open === "number" && Number.isInteger(row.open) && row.open >= 0 && row.open <= 20);
  });
}
