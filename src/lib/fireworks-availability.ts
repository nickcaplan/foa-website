export type Shift = { endsAt: string; open: number };
export type Activity = { name?: string; rows?: Shift[]; checkedAt?: string; unavailable?: boolean };
export type Snapshot = { schema?: number; activities?: Record<string, Activity> };
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
