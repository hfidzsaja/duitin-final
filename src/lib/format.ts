// Utilitas format Indonesia untuk Duitin

export function formatRupiah(n: number, opts?: { signed?: boolean }): string {
  const abs = Math.abs(Math.round(n))
  const s = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(abs)
  if (opts?.signed) return `${n < 0 ? "-" : "+"}Rp${s}`
  return `${n < 0 ? "-" : ""}Rp${s}`
}

// Ringkas: 25rb, 1,2jt, 850jt
export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000_000) return `${sign}${trimZero(abs / 1_000_000_000)}M`
  if (abs >= 1_000_000) return `${sign}${trimZero(abs / 1_000_000)}jt`
  if (abs >= 1_000) return `${sign}${trimZero(abs / 1_000)}rb`
  return `${sign}${Math.round(abs)}`
}

function trimZero(v: number): string {
  const s = v.toFixed(1).replace(/\.0$/, "").replace(".", ",")
  return s
}

export function formatTanggal(d: Date | string, style: "full" | "short" | "day" = "short"): string {
  const date = typeof d === "string" ? new Date(d) : d
  if (style === "full") {
    return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }
  if (style === "day") {
    return date.toLocaleDateString("id-ID", { weekday: "long" })
  }
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

// "2026-11" -> "November 2026"
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return currentMonthKey(d)
}

export function isFutureMonth(month: string): boolean {
  return month > currentMonthKey()
}

// "Hari ini", "Kemarin", atau tanggal
export function relativeDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (diff === 0) return "Hari ini"
  if (diff === 1) return "Kemarin"
  return formatTanggal(date, "full")
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return "Selamat pagi"
  if (h < 15) return "Selamat siang"
  if (h < 18) return "Selamat sore"
  return "Selamat malam"
}
