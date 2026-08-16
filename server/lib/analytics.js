/** Aggregations shared by the stats and analytics endpoints. */

/** Buckets rows into fixed-size time slices for trend charts. */
export function timeseries(rows, dateKey, { hours = 24, buckets = 24 } = {}) {
  const now = Date.now();
  const windowMs = hours * 3600 * 1000;
  const bucketMs = windowMs / buckets;
  const start = now - windowMs;

  const series = Array.from({ length: buckets }, (_, i) => ({
    t: new Date(start + i * bucketMs).toISOString(),
    count: 0,
  }));

  for (const row of rows) {
    const ts = new Date(row[dateKey]).getTime();
    if (Number.isNaN(ts) || ts < start || ts > now) continue;
    const idx = Math.min(buckets - 1, Math.floor((ts - start) / bucketMs));
    series[idx].count += 1;
  }

  return series;
}

export function countBy(rows, key) {
  const out = {};
  for (const row of rows) {
    const value = (typeof key === 'function' ? key(row) : row[key]) || 'unknown';
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

/** Distribution of conversations across turn-count ranges. */
export function turnHistogram(conversations) {
  const buckets = [
    { label: '1', min: 1, max: 1 },
    { label: '2-3', min: 2, max: 3 },
    { label: '4-6', min: 4, max: 6 },
    { label: '7-10', min: 7, max: 10 },
    { label: '11+', min: 11, max: Infinity },
  ];
  return buckets.map((b) => ({
    range: b.label,
    count: conversations.filter(
      (c) => (c.turn_count || 0) >= b.min && (c.turn_count || 0) <= b.max
    ).length,
  }));
}

/** Mean confidence per intel type, for a quality-of-evidence view. */
export function confidenceByType(intelligence) {
  const groups = {};
  for (const item of intelligence) {
    (groups[item.intel_type] ??= []).push(item.confidence ?? 0);
  }
  return Object.entries(groups).map(([type, values]) => ({
    type,
    count: values.length,
    avg_confidence: Number(
      (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3)
    ),
  }));
}

/** Escapes and joins rows into a CSV document. */
export function toCsv(rows, columns) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(','));
  return [header, ...body].join('\r\n');
}
