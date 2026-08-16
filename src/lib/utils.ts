import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * date-fns throws a RangeError on an unparseable value, which is enough to
 * take a whole panel down. Timestamps come from the API, so treat a bad one
 * as missing data and keep rendering.
 */
export function safeRelativeTime(value: string | null | undefined): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function safeTime(value: string | null | undefined, pattern = "HH:mm:ss"): string {
  if (!value) return "--:--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return format(date, pattern);
}
