"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  useBudgets,
  useGoals,
  useDebts,
  useCategories,
  useSaveBudget,
  useDeleteBudget,
  useCreateGoal,
  useDepositGoal,
  useDeleteGoal,
  useCreateDebt,
  usePayDebt,
  useDeleteDebt,
} from "./queries"
import { formatRupiah, currentMonthKey, monthLabel, shiftMonth, isFutureMonth } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2, PiggyBank, Target, Scale, CalendarClock } from "lucide-react"

function AmountField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 h-12 focus-within:ring-2 focus-within:ring-ring/50 transition">
      <span className="font-semibold text-muted-foreground">Rp</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(new Intl.NumberFormat("id-ID").format(Number(e.target.value.replace(/\D/g, "").slice(0, 12)) || 0).replace(/^0(?=.)/, ""))}
        placeholder={placeholder ?? "0"}
        className="flex-1 bg-transparent text-lg font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
        aria-label="Nominal"
      />
    </div>
  )
}

const num = (s: string) => Number(s.replace(/\D/g, "")) || 0

// ================= TAB ANGGARAN =================

function AnggaranTab() {
  const { toast } = useToast()
  const [month, setMonth] = useState(currentMonthKey())
  const { data: budgets = [], isLoading } = useBudgets(month)
  const { data: categories = [] } = useCategories()
  const saveBudget = useSaveBudget()
  const delBudget = useDeleteBudget()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; categoryId: string; name: string; amount: number } | null>(null)
  const [pickCat, setPickCat] = useState("")
  const [amount, setAmount] = useState("")

  const totals = useMemo(() => {
    const total = budgets.reduce((a, b) => a + b.amount, 0)
    const spent = budgets.reduce((a, b) => a + b.spent, 0)
    return { total, spent, remaining: total - spent, pct: total > 0 ? Math.round((spent / total) * 100) : 0 }
  }, [budgets])

  const unbudgetedCats = useMemo(
    () => categories.filter((c) => c.type === "expense" && !budgets.some((b) => b.categoryId === c.id)),
    [categories, budgets]
  )

  function openNew() {
    setEditTarget(null)
    setPickCat(unbudgetedCats[0]?.id ?? "")
    setAmount("")
    setDialogOpen(true)
  }
  function openEdit(b: { id: string; categoryId: string; amount: number; category: { name: string } }) {
    setEditTarget({ id: b.id, categoryId: b.categoryId, name: b.category.name, amount: b.amount })
    setAmount(new Intl.NumberFormat("id-ID").format(b.amount))
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!editTarget && !pickCat) {
      toast({ title: "Pilih kategori dulu", variant: "destructive" })
      return
    }
    const amountNum = num(amount)
    if (amountNum <= 0) {
      toast({ title: "Nominal tidak valid", variant: "destructive" })
      return
    }
    try {
      await saveBudget.mutateAsync({
        categoryId: editTarget?.categoryId ?? pickCat,
        month,
        amount: amountNum,
      })
      toast({ title: "Anggaran tersimpan ✅" })
      setDialogOpen(false)
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  const barColor = (pct: number) => (pct > 100 ? "#fb7185" : pct > 75 ? "#fbbf24" : "#34d399")

  return (
    <div className="space-y-4">
      {/* Pemilih bulan */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-border h-9 px-1 bg-card/60">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent" aria-label="Bulan sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold min-w-[110px] text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth((m) => (!isFutureMonth(shiftMonth(m, 1)) ? shiftMonth(m, 1) : m))}
            disabled={isFutureMonth(shiftMonth(month, 1))}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent disabled:opacity-30"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button size="sm" onClick={openNew} className="h-9">
          <Plus className="h-4 w-4" /> Anggaran
        </Button>
      </div>

      {/* Ringkasan */}
      <Card className="glass-card border-border/50 rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-muted-foreground">Sisa anggaran bulan ini</p>
          <p className="text-xs text-muted-foreground tabular-nums">{totals.pct}% terpakai</p>
        </div>
        <p className={cn("text-3xl font-extrabold tabular-nums mt-1", totals.remaining < 0 ? "text-expense" : "text-foreground")}>
          {formatRupiah(totals.remaining)}
        </p>
        <div className="mt-3 h-2.5 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, totals.pct)}%`, background: barColor(totals.pct) }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>Keluar: {formatRupiah(totals.spent)}</span>
          <span>Budget: {formatRupiah(totals.total)}</span>
        </div>
      </Card>

      {/* Daftar anggaran */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : budgets.length === 0 ? (
        <Card className="glass-card border-border/50 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada anggaran untuk {monthLabel(month)}. Tekan “+ Anggaran” untuk mulai.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0
            return (
              <Card key={b.id} className="glass-card border-border/50 rounded-2xl p-4">
                <button onClick={() => openEdit(b)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-background" style={{ background: b.category.color }} aria-hidden>
                        {b.category.name.charAt(0)}
                      </span>
                      {b.category.name}
                      {b.over && (
                        <span className="rounded-full bg-expense/15 text-expense text-[10px] font-bold px-2 py-0.5">
                          Lewat {pct - 100}%
                        </span>
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatRupiah(b.spent)} / {formatRupiah(b.amount)}
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: barColor(pct) }} />
                  </div>
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog tambah/ubah anggaran */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Ubah Anggaran ${editTarget.name}` : "Set Anggaran Baru"}</DialogTitle>
            <DialogDescription>Batasi pengeluaran per kategori untuk {monthLabel(month)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editTarget && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kategori pengeluaran</label>
                {unbudgetedCats.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">Semua kategori sudah punya anggaran bulan ini 🎉</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {unbudgetedCats.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setPickCat(c.id)}
                        className={cn(
                          "h-8 px-3 rounded-full border text-xs font-medium transition",
                          pickCat === c.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/60"
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Batas pengeluaran</label>
              <div className="mt-1.5">
                <AmountField value={amount} onChange={setAmount} />
              </div>
            </div>
            <div className="flex gap-2">
              {editTarget && (
                <Button
                  variant="outline"
                  size="icon"
                  className="text-expense border-expense/30 hover:bg-expense/10"
                  aria-label="Hapus anggaran"
                  onClick={async () => {
                    try {
                      await delBudget.mutateAsync(editTarget.id)
                      toast({ title: "Anggaran dihapus" })
                      setDialogOpen(false)
                    } catch {
                      toast({ title: "Gagal menghapus", variant: "destructive" })
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button className="flex-1" onClick={handleSave} disabled={saveBudget.isPending}>
                {saveBudget.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ================= TAB TABUNGAN =================

function TabunganTab() {
  const { toast } = useToast()
  const { data: goals = [], isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const depositGoal = useDepositGoal()
  const deleteGoal = useDeleteGoal()

  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [initial, setInitial] = useState("")
  const [deadline, setDeadline] = useState("")

  const [depositFor, setDepositFor] = useState<string | null>(null)
  const [depositAmt, setDepositAmt] = useState("")

  const totalTercapai = goals.reduce((a, g) => a + Math.min(g.currentAmount, g.targetAmount), 0)
  const totalTarget = goals.reduce((a, g) => a + g.targetAmount, 0)

  async function handleCreate() {
    if (!name.trim()) return toast({ title: "Nama target wajib diisi", variant: "destructive" })
    if (num(target) <= 0) return toast({ title: "Nominal target tidak valid", variant: "destructive" })
    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        targetAmount: num(target),
        currentAmount: num(initial),
        deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
      })
      toast({ title: "Target baru dibuat 🎯", description: name })
      setNewOpen(false)
      setName("")
      setTarget("")
      setInitial("")
      setDeadline("")
    } catch (e) {
      toast({ title: "Gagal membuat target", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  async function handleDeposit() {
    if (!depositFor) return
    const v = num(depositAmt)
    if (v <= 0) return toast({ title: "Nominal setor tidak valid", variant: "destructive" })
    try {
      const goal = goals.find((g) => g.id === depositFor)
      await depositGoal.mutateAsync({ id: depositFor, deposit: v })
      if (goal && goal.currentAmount < goal.targetAmount && goal.currentAmount + v >= goal.targetAmount) {
        toast({ title: `Selamat! Target “${goal.name}” tercapai 🎉` })
      } else {
        toast({ title: "Setoran masuk 💰", description: formatRupiah(v) })
      }
      setDepositFor(null)
      setDepositAmt("")
    } catch (e) {
      toast({ title: "Gagal setor", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/50 rounded-2xl p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
          <PiggyBank className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Total terkumpul dari semua target</p>
          <p className="text-xl font-extrabold tabular-nums">{formatRupiah(totalTercapai)}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">dari target gabungan {formatRupiah(totalTarget)}</p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setNewOpen(true)} className="h-9">
          <Plus className="h-4 w-4" /> Target Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : goals.length === 0 ? (
        <Card className="glass-card border-border/50 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada target menabung. Buat target pertamamu!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
            const done = g.currentAmount >= g.targetAmount
            return (
              <Card key={g.id} className="glass-card border-border/50 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${g.color}22`, color: g.color }}>
                      <Target className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatRupiah(g.currentAmount)} / {formatRupiah(g.targetAmount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deleteGoal.mutateAsync(g.id)
                        toast({ title: "Target dihapus" })
                      } catch {
                        toast({ title: "Gagal menghapus", variant: "destructive" })
                      }
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-expense hover:bg-expense/10 transition shrink-0"
                    aria-label={`Hapus target ${g.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: done ? "#34d399" : `linear-gradient(90deg, ${g.color}88, ${g.color})` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 tabular-nums">
                    {g.deadline && (
                      <>
                        <CalendarClock className="h-3 w-3" />
                        {new Date(g.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </>
                    )}
                    {done && <span className="text-income font-bold">Tercapai! 🎉</span>}
                  </span>
                  <button
                    onClick={() => {
                      setDepositFor(g.id)
                      setDepositAmt("")
                    }}
                    className="h-8 rounded-full bg-primary/15 text-primary text-xs font-bold px-3.5 hover:bg-primary/25 transition"
                  >
                    {done ? "Tambah" : `+ Setor · sisa ${formatRupiah(g.targetAmount - g.currentAmount)}`}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog target baru */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Target Menabung Baru</DialogTitle>
            <DialogDescription>Contoh: Dana Darurat, DP Motor, Liburan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nama target</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="misal: Beli Laptop" className="mt-1.5 h-10 bg-background/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nominal target</label>
              <div className="mt-1.5"><AmountField value={target} onChange={setTarget} /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Saldo awal (opsional)</label>
              <div className="mt-1.5"><AmountField value={initial} onChange={setInitial} /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tenggat (opsional)</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1.5 h-10 bg-background/60" />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createGoal.isPending}>
              {createGoal.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Buat Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog setor */}
      <Dialog open={!!depositFor} onOpenChange={(o) => !o && setDepositFor(null)}>
        <DialogContent className="sm:max-w-xs rounded-3xl">
          <DialogHeader>
            <DialogTitle>Setor Tabungan</DialogTitle>
            <DialogDescription>{goals.find((g) => g.id === depositFor)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <AmountField value={depositAmt} onChange={setDepositAmt} />
            <div className="flex flex-wrap gap-1.5">
              {[50000, 100000, 500000, 1000000].map((v) => (
                <button key={v} onClick={() => setDepositAmt(new Intl.NumberFormat("id-ID").format(v))} className="h-8 px-3 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition">
                  {formatRupiah(v)}
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={handleDeposit} disabled={depositGoal.isPending}>
              {depositGoal.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Setor Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ================= TAB HUTANG =================

function HutangTab() {
  const { toast } = useToast()
  const { data: debts = [], isLoading } = useDebts()
  const createDebt = useCreateDebt()
  const payDebt = usePayDebt()
  const deleteDebt = useDeleteDebt()

  const [seg, setSeg] = useState<"debt" | "receivable">("debt")
  const [newOpen, setNewOpen] = useState(false)
  const [type, setType] = useState<"debt" | "receivable">("debt")
  const [person, setPerson] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [payFor, setPayFor] = useState<string | null>(null)
  const [payAmt, setPayAmt] = useState("")

  const sums = useMemo(() => {
    const active = debts.filter((d) => !d.settled)
    return {
      debt: active.filter((d) => d.type === "debt").reduce((a, d) => a + (d.amount - d.paidAmount), 0),
      receivable: active.filter((d) => d.type === "receivable").reduce((a, d) => a + (d.amount - d.paidAmount), 0),
    }
  }, [debts])

  const list = useMemo(() => debts.filter((d) => (seg === "debt" ? d.type === "debt" : d.type === "receivable") && !d.settled), [debts, seg])
  const settledList = useMemo(() => debts.filter((d) => d.settled), [debts])
  const nowTs = Date.now()

  async function handleCreate() {
    if (!person.trim()) return toast({ title: "Nama pihak wajib diisi", variant: "destructive" })
    if (num(amount) <= 0) return toast({ title: "Nominal tidak valid", variant: "destructive" })
    try {
      await createDebt.mutateAsync({
        type,
        person: person.trim(),
        amount: num(amount),
        note: note.trim(),
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
      })
      toast({ title: type === "debt" ? "Hutang tercatat 📌" : "Piutang tercatat 📌" })
      setNewOpen(false)
      setPerson("")
      setAmount("")
      setNote("")
      setDueDate("")
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  async function handlePay() {
    if (!payFor) return
    const v = num(payAmt)
    if (v <= 0) return toast({ title: "Nominal bayar tidak valid", variant: "destructive" })
    try {
      const d = debts.find((x) => x.id === payFor)
      await payDebt.mutateAsync({ id: payFor, pay: v })
      if (d && d.paidAmount < d.amount && d.paidAmount + v >= d.amount) {
        toast({ title: `Lunas dengan ${d.person} 🎉` })
      } else {
        toast({ title: "Pembayaran tercatat ✅" })
      }
      setPayFor(null)
      setPayAmt("")
    } catch (e) {
      toast({ title: "Gagal mencatat pembayaran", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card border-border/50 rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-expense" /> Saya berhutang
          </p>
          <p className="text-lg font-bold text-expense tabular-nums mt-1">{formatRupiah(sums.debt)}</p>
        </Card>
        <Card className="glass-card border-border/50 rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-income" /> Saya piutang
          </p>
          <p className="text-lg font-bold text-income tabular-nums mt-1">{formatRupiah(sums.receivable)}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex rounded-xl border border-border overflow-hidden h-9">
          {(["debt", "receivable"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSeg(t)}
              className={cn("px-4 text-xs font-medium transition", seg === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/50")}
            >
              {t === "debt" ? "Hutang" : "Piutang"}
            </button>
          ))}
        </div>
        <Button size="sm" className="h-9" onClick={() => { setType(seg); setNewOpen(true) }}>
          <Plus className="h-4 w-4" /> Catat
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <Card className="glass-card border-border/50 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {seg === "debt" ? "Tidak ada hutang aktif. Enak nih! 🎉" : "Belum ada piutang aktif."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((d) => {
            const pct = Math.round((d.paidAmount / d.amount) * 100)
            const overdue = d.dueDate && !d.settled && new Date(d.dueDate).getTime() < nowTs
            const dueSoon = d.dueDate && !d.settled && new Date(d.dueDate).getTime() > nowTs && new Date(d.dueDate).getTime() - nowTs < 7 * 86400000
            return (
              <Card key={d.id} className="glass-card border-border/50 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2">
                      {d.person}
                      {(overdue || dueSoon) && (
                        <span className={cn("rounded-full text-[10px] font-bold px-2 py-0.5", overdue ? "bg-expense/15 text-expense" : "bg-amber-400/15 text-amber-300")}>
                          {overdue ? "Lewat jatuh tempo" : "Segera jatuh tempo"}
                        </span>
                      )}
                    </p>
                    {d.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{d.note}</p>}
                  </div>
                  <p className={cn("text-sm font-bold tabular-nums shrink-0", d.type === "debt" ? "text-expense" : "text-income")}>
                    {formatRupiah(d.amount - d.paidAmount)}
                  </p>
                </div>
                <div className="mt-2.5 h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: d.type === "debt" ? "#fb7185" : "#34d399" }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Terbayar {formatRupiah(d.paidAmount)} · {pct}%
                    {d.dueDate && ` · tempo ${new Date(d.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await payDebt.mutateAsync({ id: d.id, pay: d.amount - d.paidAmount })
                          toast({ title: `Lunas dengan ${d.person} 🎉` })
                        } catch {
                          toast({ title: "Gagal menandai lunas", variant: "destructive" })
                        }
                      }}
                      className="h-8 rounded-full border border-border text-xs font-medium text-muted-foreground px-3 hover:bg-accent transition"
                    >
                      Tandai Lunas
                    </button>
                    <button
                      onClick={() => { setPayFor(d.id); setPayAmt("") }}
                      className="h-8 rounded-full bg-primary/15 text-primary text-xs font-bold px-3.5 hover:bg-primary/25 transition"
                    >
                      + Bayar
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteDebt.mutateAsync(d.id)
                          toast({ title: "Catatan dihapus" })
                        } catch {
                          toast({ title: "Gagal menghapus", variant: "destructive" })
                        }
                      }}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-expense hover:bg-expense/10 transition"
                      aria-label={`Hapus catatan ${d.person}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {settledList.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted-foreground px-2 mb-1.5">Riwayat Lunas</h3>
          <Card className="glass-card border-border/50 rounded-2xl overflow-hidden divide-y divide-border/40 py-0">
            {settledList.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs">
                  <span className="font-semibold">{d.person}</span>
                  <span className="text-muted-foreground"> · {d.type === "debt" ? "hutang" : "piutang"}</span>
                </span>
                <span className="text-xs font-bold text-income tabular-nums">Lunas {formatRupiah(d.amount)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Dialog catat baru */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Catat {type === "debt" ? "Hutang" : "Piutang"}</DialogTitle>
            <DialogDescription>
              {type === "debt" ? "Uang yang kamu pinjam dari orang lain." : "Uang kamu yang dipinjam orang lain."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60">
              {(["debt", "receivable"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "h-9 rounded-lg text-xs font-semibold transition",
                    type === t ? (t === "debt" ? "bg-expense/20 text-expense" : "bg-income/20 text-income") : "text-muted-foreground"
                  )}
                >
                  {t === "debt" ? "Saya berhutang" : "Saya piutang"}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nama pihak</label>
              <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="misal: Rudi / Kartu Kredit" className="mt-1.5 h-10 bg-background/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nominal</label>
              <div className="mt-1.5"><AmountField value={amount} onChange={setAmount} /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Catatan (opsional)</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="untuk apa" className="mt-1.5 h-10 bg-background/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Jatuh tempo (opsional)</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 h-10 bg-background/60" />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createDebt.isPending}>
              {createDebt.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog bayar */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="sm:max-w-xs rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cicil / Bayar</DialogTitle>
            <DialogDescription>
              {debts.find((d) => d.id === payFor)?.person} · sisa{" "}
              {formatRupiah((debts.find((d) => d.id === payFor)?.amount ?? 0) - (debts.find((d) => d.id === payFor)?.paidAmount ?? 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <AmountField value={payAmt} onChange={setPayAmt} />
            <Button className="w-full" onClick={handlePay} disabled={payDebt.isPending}>
              {payDebt.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Bayar Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ================= HALAMAN RENCANA =================

export function PagePlans() {
  const [tab, setTab] = useState<"anggaran" | "tabungan" | "hutang">("anggaran")
  const tabs = [
    { id: "anggaran" as const, label: "Anggaran", icon: Scale },
    { id: "tabungan" as const, label: "Tabungan", icon: PiggyBank },
    { id: "hutang" as const, label: "Hutang", icon: Target },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-muted/50 border border-border/40">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all",
                tab === t.id ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={tab === t.id}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          )
        })}
      </div>
      {tab === "anggaran" && <AnggaranTab />}
      {tab === "tabungan" && <TabunganTab />}
      {tab === "hutang" && <HutangTab />}
    </div>
  )
}
