"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { useTransactions, useWallets, useCategories, type TxFilter } from "./queries"
import { formatRupiah, currentMonthKey, monthLabel, relativeDay, shiftMonth, isFutureMonth } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Transaction } from "./types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListFilter,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

interface Props {
  onEditTx: (tx: Transaction) => void
}

type ViewMode = "list" | "calendar"

export function PageTransactions({ onEditTx }: Props) {
  const [month, setMonth] = useState(currentMonthKey())
  const [type, setType] = useState<"all" | "income" | "expense">("all")
  const [walletId, setWalletId] = useState("all")
  const [categoryId, setCategoryId] = useState("all")
  const [search, setSearch] = useState("")
  const [view, setView] = useState<ViewMode>("list")

  const filter: TxFilter = useMemo(
    () => ({
      month,
      type,
      walletId: walletId === "all" ? undefined : walletId,
      categoryId: categoryId === "all" ? undefined : categoryId,
      search: search.trim() || undefined,
    }),
    [month, type, walletId, categoryId, search]
  )

  const { data: txs = [], isLoading } = useTransactions(filter)
  const { data: wallets = [] } = useWallets()
  const { data: categories = [] } = useCategories()

  // Grouping per hari
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of txs) {
      const key = new Date(tx.date).toDateString()
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    return [...map.entries()].map(([key, list]) => {
      const dayNet = list.reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0)
      return { key, list, dayNet }
    })
  }, [txs])

  const totals = useMemo(() => {
    const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0)
    const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0)
    return { income, expense }
  }, [txs])

  // Kalender: total keluar & masuk per tanggal
  const calendarData = useMemo(() => {
    const [y, m] = month.split("-").map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const perDay = new Map<number, { expense: number; income: number }>()
    for (const tx of txs) {
      const d = new Date(tx.date).getDate()
      const cur = perDay.get(d) ?? { expense: 0, income: 0 }
      if (tx.type === "expense") cur.expense += tx.amount
      else cur.income += tx.amount
      perDay.set(d, cur)
    }
    const firstDow = new Date(y, m - 1, 1).getDay()
    const maxSpend = Math.max(1, ...[...perDay.values()].map((v) => v.expense))
    return { daysInMonth, perDay, firstDow, maxSpend }
  }, [txs, month])

  const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

  return (
    <div className="space-y-4">
      {/* Ringkasan bulan terpilih */}
      <section className="grid grid-cols-2 gap-3">
        <Card className="glass-card border-border/50 rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-income" /> Masuk bulan ini
          </p>
          <p className="text-lg font-bold text-income tabular-nums mt-1">{formatRupiah(totals.income)}</p>
        </Card>
        <Card className="glass-card border-border/50 rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-expense" /> Keluar bulan ini
          </p>
          <p className="text-lg font-bold text-expense tabular-nums mt-1">{formatRupiah(totals.expense)}</p>
        </Card>
      </section>

      {/* Filter bar */}
      <Card className="glass-card border-border/50 rounded-2xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari transaksi…"
              className="pl-9 h-10 bg-background/60"
              aria-label="Cari transaksi"
            />
          </div>
          <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setView("list")}
              className={cn("h-10 px-3 flex items-center gap-1.5 text-xs font-medium transition", view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/50")}
              aria-pressed={view === "list"}
            >
              <ListFilter className="h-3.5 w-3.5" /> Daftar
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("h-10 px-3 flex items-center gap-1.5 text-xs font-medium transition", view === "calendar" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/50")}
              aria-pressed={view === "calendar"}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Kalender
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Pilih bulan */}
          <div className="flex items-center gap-1 rounded-xl border border-border h-9 px-1">
            <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent" aria-label="Bulan sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold min-w-[110px] text-center">{monthLabel(month)}</span>
            <button
              onClick={() => setMonth((m) => !isFutureMonth(shiftMonth(m, 1)) ? shiftMonth(m, 1) : m)}
              disabled={isFutureMonth(shiftMonth(month, 1))}
              className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent disabled:opacity-30"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex rounded-xl border border-border overflow-hidden h-9">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn("px-3 text-xs font-medium transition", type === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/50")}
              >
                {t === "all" ? "Semua" : t === "income" ? "Masuk" : "Keluar"}
              </button>
            ))}
          </div>

          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger className="h-9 w-[130px] text-xs bg-background/60" aria-label="Filter dompet">
              <SelectValue placeholder="Dompet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua dompet</SelectItem>
              {wallets.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-[140px] text-xs bg-background/60" aria-label="Filter kategori">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Konten */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : view === "calendar" ? (
        <Card className="glass-card border-border/50 rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(calendarData.firstDow)].map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {[...Array(calendarData.daysInMonth)].map((_, i) => {
              const day = i + 1
              const data = calendarData.perDay.get(day)
              const intensity = data ? Math.min(1, data.expense / calendarData.maxSpend) : 0
              const isToday = new Date().toDateString() === new Date(new Date().getFullYear(), Number(month.split("-")[1]) - 1, day).toDateString()
              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 border text-[10px] transition",
                    isToday ? "border-primary/60" : "border-transparent"
                  )}
                  style={{
                    background: data && data.expense > 0 ? `oklch(0.72 0.18 16 / ${0.12 + intensity * 0.45})` : "rgba(255,255,255,0.03)",
                  }}
                  title={data ? `Keluar: ${formatRupiah(data.expense)}${data.income ? ` · Masuk: ${formatRupiah(data.income)}` : ""}` : undefined}
                >
                  <span className={cn("font-semibold", isToday && "text-primary")}>{day}</span>
                  {data && data.expense > 0 && (
                    <span className="text-expense font-bold tabular-nums leading-none">
                      {data.expense >= 1000 ? `${Math.round(data.expense / 1000)}rb` : ""}
                    </span>
                  )}
                  {data && data.income > 0 && (
                    <span className="text-income font-bold tabular-nums leading-none text-[9px]">+{Math.round(data.income / 1000)}rb</span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Semakin merah kotaknya, semakin besar pengeluaran hari itu. Ketuk-tahan untuk detail.
          </p>
        </Card>
      ) : txs.length === 0 ? (
        <Card className="glass-card border-border/50 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Tidak ada transaksi yang cocok dengan filter.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key} aria-label={relativeDay(g.list[0].date)}>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <h3 className="text-xs font-bold text-muted-foreground">{relativeDay(g.list[0].date)}</h3>
                <span className={cn("text-xs font-bold tabular-nums", g.dayNet >= 0 ? "text-income" : "text-expense")}>
                  {g.dayNet >= 0 ? "+" : "−"}
                  {formatRupiah(Math.abs(g.dayNet)).replace("-", "")}
                </span>
              </div>
              <Card className="glass-card border-border/50 rounded-2xl overflow-hidden divide-y divide-border/40 py-0">
                {g.list.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => onEditTx(tx)}
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
                    <span className={cn("text-sm font-bold tabular-nums shrink-0", tx.type === "income" ? "text-income" : "text-expense")}>
                      {tx.type === "income" ? "+" : "−"}
                      {formatRupiah(tx.amount)}
                    </span>
                  </button>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
