/**
 * Safely parses a date string into a Date object as UTC.
 * If the string lacks a timezone offset or trailing 'Z' (e.g. from SQLite naive timestamps),
 * it treats it as UTC so JavaScript accurately converts it to the user's local timezone.
 */
export function parseUtcDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
    return new Date(`${normalized}Z`);
  }
  return new Date(normalized);
}

export function formatLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
