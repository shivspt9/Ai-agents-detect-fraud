/**
 * Chart palette and chrome.
 *
 * Every value here was checked with the data-viz validator against this app's
 * card surface (#0B111E, the `--card` token) in dark mode:
 *
 *  - CATEGORICAL (2 series): all checks pass — worst adjacent CVD ΔE 26.8,
 *    normal-vision ΔE 31.8, both inside the dark lightness band.
 *  - RAMP (ordinal magnitude): monotone light→dark, all adjacent ΔL ≥ 0.06,
 *    dark end 2.85:1 against the surface, hue spread 3°.
 *
 * Re-run the validator before changing any of these.
 */

/** Identity colors. Assigned in fixed order — never cycled, never generated. */
export const CATEGORICAL = ['#3987e5', '#d95926'] as const;

/** Ordinal ramp for magnitude comparisons, palest = smallest. */
export const RAMP = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#1c5cab'] as const;

/**
 * Picks a ramp step by rank. Larger values get the darker, denser steps so
 * the bar that matters reads heaviest.
 */
export function rampStep(index: number, total: number): string {
  if (total <= 1) return RAMP[3];
  const position = index / (total - 1);
  return RAMP[Math.min(RAMP.length - 1, Math.round(position * (RAMP.length - 1)))];
}

/** Chart chrome, matching the reference ink/grid tokens for a dark surface. */
export const CHROME = {
  grid: 'rgba(255,255,255,0.06)',
  axis: '#898781',
  axisLine: '#383835',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  surface: '#0B111E',
};

/**
 * Threat bands are a *status* encoding, not a series: they always ship with
 * their label as text, so color never carries the meaning alone.
 */
export const BAND_STATUS: Record<string, { color: string; label: string }> = {
  critical: { color: '#d03b3b', label: 'Critical' },
  high: { color: '#ec835a', label: 'High' },
  medium: { color: '#fab219', label: 'Medium' },
  low: { color: '#0ca30c', label: 'Low' },
  none: { color: '#898781', label: 'None' },
};

export const BAND_ORDER = ['critical', 'high', 'medium', 'low', 'none'] as const;

/** Turns a snake_case key into a readable label. */
export function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUpi\b/, 'UPI')
    .replace(/\bIfsc\b/, 'IFSC')
    .replace(/\bUrl\b/, 'URL')
    .replace(/\bKyc\b/, 'KYC');
}
