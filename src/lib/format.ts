const THB = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export function formatTHB(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return THB.format(Number.isFinite(n) ? n : 0);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
