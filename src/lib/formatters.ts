export function fmtMin(min: number | undefined | null): string {
  if (!min && min !== 0) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

// Monday-based week
export function startOfWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekDays(startISO: string): { iso: string; label: string; limitMin: number; isSat: boolean }[] {
  const days: { iso: string; label: string; limitMin: number; isSat: boolean }[] = [];
  const nomes = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  for (let i = 0; i < 6; i++) {
    const iso = addDays(startISO, i);
    const isSat = i === 5;
    days.push({ iso, label: nomes[i], limitMin: isSat ? 8 * 60 : 8 * 60 + 48, isSat });
  }
  return days;
}

export function minutesBetween(a?: string, b?: string): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

export function nowISO(): string {
  return new Date().toISOString();
}
