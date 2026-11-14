// Same split as the server (largest remainder, in paisay) so the preview matches what gets saved.
export function allocate(total, weights) {
  const sw = weights.reduce((a, b) => a + b, 0); if (!sw || !total) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sw), base = raw.map(Math.floor); let rem = total - base.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { base[i]++; rem--; } });
  return base;
}
export const paisa = (v) => Math.round((Number(v) || 0) * 100);
// Same pricing rules as the server. All values in paisay. base = confirmed rate in RUPEES per the item's own unit.
export function priceLine(l, it, base, override) {
  const qty = Number(l.qty) || 0;
  if (override !== "" && override != null) { const r = paisa(override); return { rate: r, amount: Math.round(qty * r) }; }
  if (base == null) return { rate: null, amount: null };
  const b = paisa(base);
  if (l.unit === "piece" && it.unit === "carton") return { rate: Math.round(b / it.pcsPerCarton), amount: Math.round((qty * b) / it.pcsPerCarton) };
  return { rate: b, amount: Math.round(qty * b) };
}
