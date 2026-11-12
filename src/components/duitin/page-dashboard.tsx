"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useStats, useTransactions, useSession } from "./queries"
import { formatRupiah, formatCompact, greeting, formatTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Transaction } from "./types"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Landmark,
  Smartphone,
  Coins,
  Flame,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react"

// ---------- Komponen kecil ----------

function HealthRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score)) / 100
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#fb7185"
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Skor kesehatan keuangan ${score} dari 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">dari 100</span>
      </div>
    </div>
  )
}

function walletIcon(type: string) {
  if (type === "bank") return <Landmark className="h-3.5 w-3.5" />
  if (type === "ewallet") return <Smartphone className="h-3.5 w-3.5" />
  return <Coins className="h-3.5 w-3.5" />
}

const insightStyles = {
  info: { icon: Info, cls: "text-primary bg-primary/10 border-primary/20" },
  warning: { icon: AlertTriangle, cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  success: { icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  tip: { icon: Sparkles, cls: "text-teal-300 bg-teal-300/10 border-teal-300/20" },
} as const

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name === "income" ? "Masuk" : "Keluar"}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  )
}

function TxRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const income = tx.type === "income"
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition text-left"
    >
      <span
        className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-background"
        style={{ backgroundColor: tx.category.color }}
        aria-hidden
      >
        {tx.category.name.charAt(0)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tx.category.name} · {tx.wallet.name}
        </p>
      </div>
      <span className={cn("text-sm font-bold tabular-nums shrink-0", income ? "text-income" : "text-expense")}>
        {income ? "+" : "−"}
        {formatRupiah(tx.amount)}
      </span>
    </button>
  )
}

// ---------- Halaman Beranda ----------

export function PageDashboard({ onNavigate, onEditTx }: {
  onNavigate: (tab: "transactions" | "plans" | "wallets" | "assistant") => void
  onEditTx: (tx: Transaction) => void
}) {
  const { data: stats, isLoading } = useStats()
  const { data: session } = useSession()
  const { data: recent = [] } = useTransactions({ limit: 7 })
  const [hideBalance, setHideBalance] = useState(false)

  const chartData = useMemo(
    () => stats?.trend.map((t) => ({ ...t, income: Math.round(t.income), expense: Math.round(t.expense) })) ?? [],
    [stats]
  )
  const catData = useMemo(() => (stats?.categoryBreakdown ?? []).slice(0, 5), [stats])

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }

  const { monthSummary, healthScore, healthComponents, insights, walletBalances, totalBalance } = stats
  const healthLabel = healthScore >= 75 ? "Sangat Sehat 💚" : healthScore >= 50 ? "Cukup Sehat 🙂" : "Perlu Diperbaiki ⚠️"

  return (
    <div className="space-y-4">
      {/* Kartu saldo utama */}
      <section aria-label="Ringkasan saldo" className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-primary/20 shadow-2xl"
        style={{
          background:
            "linear-gradient(140deg, oklch(0.28 0.05 168 / 92%), oklch(0.2 0.03 172 / 96%) 55%, oklch(0.24 0.04 190 / 92%))",
        }}
      >
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {greeting()}{session?.name ? `, ${session.name}` : ", semangat mencatat"}! 👋
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{formatTanggal(new Date(), "full")}</p>
            </div>
            <button
              onClick={() => setHideBalance((v) => !v)}
              className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              aria-label={hideBalance ? "Tampilkan saldo" : "Sembunyikan saldo"}
            >
              {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Total Saldo {walletBalances.length} Dompet</p>
          <p className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight mt-1">
            {hideBalance ? "Rp ••••••" : formatRupiah(totalBalance)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-income/15 text-income text-xs font-semibold px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Masuk {formatRupiah(monthSummary.income)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-expense/15 text-expense text-xs font-semibold px-3 py-1.5">
              <TrendingDown className="h-3.5 w-3.5" /> Keluar {formatRupiah(monthSummary.expense)}
            </span>
            {stats.streak >= 2 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 text-amber-300 text-xs font-semibold px-3 py-1.5">
                <Flame className="h-3.5 w-3.5" /> Streak {stats.streak} hari
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Chip dompet */}
      <section aria-label="Dompet">
        <div className="flex items-center justify-between px-1 mb-2">
          <h2 className="text-sm font-bold">Dompet Saya</h2>
          <button onClick={() => onNavigate("wallets")} className="text-xs text-primary font-medium hover:underline">
            Kelola
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {walletBalances.map((w) => (
            <button
              key={w.id}
              onClick={() => onNavigate("wallets")}
              className="shrink-0 glass-card rounded-2xl px-4 py-3 min-w-[128px] text-left hover:border-primary/40 transition"
            >
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium" style={{ color: w.color }}>
                {walletIcon(w.type)} {w.name}
              </span>
              <p className="text-sm font-bold tabular-nums mt-1.5">{hideBalance ? "Rp••••" : formatCompact(w.balance)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Skor kesehatan + insight */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card border-border/50 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden /> Skor Kesehatan Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <HealthRing score={healthScore} size={116} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{healthLabel}</p>
              <ul className="mt-2 space-y-1.5">
                {healthComponents.map((h) => (
                  <li key={h.key} className="flex items-center gap-2 text-[11px]">
                    <span className="w-28 shrink-0 text-muted-foreground truncate">{h.label}</span>
                    <span className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${(h.score / h.max) * 100}%` }}
                      />
                    </span>
                    <span className="tabular-nums text-muted-foreground">{h.score}/{h.max}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 rounded-3xl flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Smart Insight Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto md:max-h-44 no-scrollbar pr-1">
              {insights.map((ins) => {
                const st = insightStyles[ins.type]
                const Icon = st.icon
                return (
                  <div key={ins.id} className={cn("shrink-0 md:shrink w-[240px] md:w-auto rounded-2xl border p-3", st.cls)}>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0" /> {ins.title}
                    </p>
                    <p className="text-[11px] text-foreground/75 mt-1 leading-relaxed">{ins.body}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Grafik tren + rincian kategori */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card border-border/50 rounded-3xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Tren 6 Bulan</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 4, left: -18, bottom: 0 }} barGap={3}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="income" name="income" fill="#34d399" radius={[5, 5, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="expense" name="expense" fill="#fb7185" radius={[5, 5, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#34d399]" /> Pemasukan</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fb7185]" /> Pengeluaran</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 rounded-3xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {catData.length === 0 && <p className="text-xs text-muted-foreground">Belum ada pengeluaran bulan ini.</p>}
            {catData.map((c) => {
              const pct = stats.monthSummary.expense > 0 ? Math.round((c.total / stats.monthSummary.expense) * 100) : 0
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} /> {c.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatRupiah(c.total)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      {/* Transaksi terakhir */}
      <Card className="glass-card border-border/50 rounded-3xl overflow-hidden">
        <CardHeader className="pb-1 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold">Transaksi Terakhir</CardTitle>
          <button onClick={() => onNavigate("transactions")} className="text-xs text-primary font-medium hover:underline">
            Lihat semua
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 && <p className="text-xs text-muted-foreground p-5">Belum ada transaksi. Tekan tombol ＋ untuk mulai.</p>}
          {recent.slice(0, 6).map((tx) => (
            <TxRow key={tx.id} tx={tx} onClick={() => onEditTx(tx)} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
