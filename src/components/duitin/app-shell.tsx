"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useSeedCheck, useRunSeed } from "./queries"
import { PageDashboard } from "./page-dashboard"
import { PageTransactions } from "./page-transactions"
import { PagePlans } from "./page-plans"
import { PageAssistant } from "./page-assistant"
import { PageWallets } from "./page-wallets"
import { TransactionDialog } from "./transaction-dialog"
import type { Transaction } from "./types"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import {
  Home,
  ReceiptText,
  PiggyBank,
  Bot,
  Wallet,
  Plus,
  BarChart3,
} from "lucide-react"

type Tab = "dashboard" | "transactions" | "plans" | "assistant" | "wallets"

const NAV: { id: Tab; label: string; icon: typeof Home; short: string }[] = [
  { id: "dashboard", label: "Beranda", icon: Home, short: "Beranda" },
  { id: "transactions", label: "Transaksi", icon: ReceiptText, short: "Transaksi" },
  { id: "plans", label: "Rencana", icon: PiggyBank, short: "Rencana" },
  { id: "assistant", label: "Asisten AI", icon: Bot, short: "Cuan AI" },
  { id: "wallets", label: "Dompet", icon: Wallet, short: "Dompet" },
]

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center" aria-hidden>
        <BarChart3 className="h-5 w-5 text-primary" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-extrabold tracking-tight">Duitin</span>
          <span className="block text-[10px] text-muted-foreground -mt-0.5">Catatan Keuangan Pintar</span>
        </span>
      )}
    </span>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>("dashboard")
  const [txOpen, setTxOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const seedCheck = useSeedCheck()
  const runSeed = useRunSeed()
  const seeding = seedCheck.isLoading || (seedCheck.data && !seedCheck.data.seeded && runSeed.isPending)

  // Auto-seed data demo saat pertama dibuka
  useEffect(() => {
    if (seedCheck.data && !seedCheck.data.seeded && !runSeed.isPending && !runSeed.isSuccess) {
      runSeed.mutate(false)
    }
  }, [seedCheck.data, runSeed])

  // Deep-link dari shortcut PWA: ?action=add / ?tab=ai
  // (deferred agar tidak setState sinkron di dalam effect)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const t = setTimeout(() => {
      if (p.get("action") === "add") setTxOpen(true)
      if (p.get("tab") === "ai") setTab("assistant")
    }, 0)
    return () => clearTimeout(t)
  }, [])

  function openAdd() {
    setEditTx(null)
    setTxOpen(true)
  }
  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setTxOpen(true)
  }

  if (seeding) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <span className="h-16 w-16 rounded-3xl bg-primary/15 flex items-center justify-center animate-pulse">
          <BarChart3 className="h-8 w-8 text-primary" />
        </span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan data demo…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      {/* ===== Sidebar desktop ===== */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border/40 bg-sidebar/80 backdrop-blur px-4 py-5 z-40">
        <Logo />
        <button
          onClick={openAdd}
          className="mt-6 h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> Catat Transaksi
        </button>
        <nav className="mt-6 space-y-1" aria-label="Navigasi utama">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = tab === n.id
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={cn(
                  "w-full h-11 rounded-xl px-3.5 flex items-center gap-3 text-sm font-medium transition-all",
                  active ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-[18px] w-[18px]" /> {n.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto glass-card rounded-2xl p-3.5 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground mb-1">💡 Dipakai banyak orang</p>
          Bagikan tautan ini — tiap orang punya data sendiri otomatis, tanpa login. Lihat panduannya di tab <b>Dompet &amp; Pengaturan</b>.
        </div>
      </aside>

      {/* ===== Konten ===== */}
      <div className="lg:pl-60">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/30">
          <div className="flex items-center justify-between h-14 px-4">
            <Logo />
            <button
              onClick={() => setTab("wallets")}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition",
                tab === "wallets" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
              )}
              aria-label="Kelola dompet"
            >
              <Wallet className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pt-4 pb-32 lg:pb-10 lg:pt-6" role="main">
          {/* Judul halaman desktop */}
          <h1 className="hidden lg:block text-xl font-extrabold tracking-tight mb-4">
            {tab === "dashboard" && "Beranda"}
            {tab === "transactions" && "Riwayat Transaksi"}
            {tab === "plans" && "Rencana Keuangan"}
            {tab === "assistant" && "Asisten Keuangan AI"}
            {tab === "wallets" && "Dompet & Pengaturan"}
          </h1>

          {tab === "dashboard" && <PageDashboard onNavigate={(t) => setTab(t)} onEditTx={openEdit} />}
          {tab === "transactions" && <PageTransactions onEditTx={openEdit} />}
          {tab === "plans" && <PagePlans />}
          {tab === "assistant" && <PageAssistant />}
          {tab === "wallets" && <PageWallets />}
        </main>
      </div>

      {/* ===== FAB (mobile) ===== */}
      <button
        onClick={openAdd}
        className="lg:hidden fixed bottom-[5.4rem] right-5 z-50 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Catat transaksi baru"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* ===== Bottom nav (mobile) ===== */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/40 bg-background/85 backdrop-blur-xl safe-bottom"
        aria-label="Navigasi bawah"
      >
        <div className="grid grid-cols-5 h-16">
          {NAV.slice(0, 2).map((n) => (
            <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />
          ))}
          <div /> {/* ruang FAB */}
          {NAV.slice(2, 4).map((n) => (
            <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />
          ))}
        </div>
      </nav>

      <TransactionDialog open={txOpen} onOpenChange={setTxOpen} editTx={editTx} />
    </div>
  )
}

function NavBtn({
  n,
  active,
  onClick,
}: {
  n: (typeof NAV)[number]
  active: boolean
  onClick: () => void
}) {
  const Icon = n.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors min-h-[44px]",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
      {n.short}
    </button>
  )
}

export function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  )
}
