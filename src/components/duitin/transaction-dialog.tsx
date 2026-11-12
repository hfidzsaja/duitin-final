"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useCategories, useWallets, useSaveTransaction, useDeleteTransaction, aiParse } from "./queries"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Loader2, Sparkles, Trash2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTx?: {
    id: string
    type: "income" | "expense"
    amount: number
    description: string
    date: string
    walletId: string
    categoryId: string
  } | null
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12)
  if (!digits) return ""
  return new Intl.NumberFormat("id-ID").format(Number(digits))
}

export function TransactionDialog({ open, onOpenChange, editTx }: Props) {
  const { toast } = useToast()
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()
  const save = useSaveTransaction()
  const del = useDeleteTransaction()

  const [type, setType] = useState<"income" | "expense">("expense")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(todayISO())
  const [walletId, setWalletId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [aiText, setAiText] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editTx) {
      setType(editTx.type)
      setAmount(formatAmountInput(String(editTx.amount)))
      setDescription(editTx.description)
      setDate(editTx.date.slice(0, 10))
      setWalletId(editTx.walletId)
      setCategoryId(editTx.categoryId)
    } else {
      setType("expense")
      setAmount("")
      setDescription("")
      setDate(todayISO())
      setWalletId(wallets[0]?.id ?? "")
      setCategoryId("")
    }
    setAiText("")
  }, [open, editTx])

  const cats = useMemo(() => categories.filter((c) => c.type === type), [categories, type])

  useEffect(() => {
    // Pastikan kategori valid saat tipe berganti
    if (cats.length > 0 && !cats.some((c) => c.id === categoryId)) {
      setCategoryId(cats[0].id)
    }
  }, [type, cats.length])

  const quickAmounts = type === "expense" ? [10000, 25000, 50000, 100000] : [500000, 1000000, 5000000]

  async function handleAiFill() {
    const text = aiText.trim()
    if (!text) return
    setAiLoading(true)
    try {
      const parsed = await aiParse(text)
      setType(parsed.type)
      if (parsed.amount > 0) setAmount(formatAmountInput(String(parsed.amount)))
      setDescription(parsed.description)
      if (parsed.categoryId) setCategoryId(parsed.categoryId)
      else {
        const fallback = categories.find((c) => c.type === parsed.type)
        if (fallback) setCategoryId(fallback.id)
      }
      if (parsed.walletId) setWalletId(parsed.walletId)
      toast({ title: "Form terisi otomatis ✨", description: "Periksa dulu, lalu simpan." })
    } catch {
      toast({ title: "Gagal membaca kalimat", description: "Coba tulis lebih jelas, misal: kopi 25rb gopay", variant: "destructive" })
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave() {
    const amountNum = Number(amount.replace(/\D/g, ""))
    if (!amountNum || amountNum <= 0) {
      toast({ title: "Nominal belum diisi", variant: "destructive" })
      return
    }
    if (!walletId || !categoryId) {
      toast({ title: "Lengkapi dompet & kategori", variant: "destructive" })
      return
    }
    try {
      await save.mutateAsync({
        id: editTx?.id,
        type,
        amount: amountNum,
        description: description.trim() || (type === "income" ? "Pemasukan" : "Pengeluaran"),
        date: new Date(`${date}T12:00:00`).toISOString(),
        walletId,
        categoryId,
      })
      toast({
        title: editTx ? "Transaksi diperbarui ✅" : "Transaksi tersimpan ✅",
        description: `${type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(amountNum)}`,
      })
      onOpenChange(false)
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  async function handleDelete() {
    if (!editTx) return
    try {
      await del.mutateAsync(editTx.id)
      toast({ title: "Transaksi dihapus" })
      onOpenChange(false)
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:translate-y-[-50%] p-0 gap-0 border-border/60">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur rounded-t-3xl px-5 pt-5 pb-3 border-b border-border/50">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg">{editTx ? "Ubah Transaksi" : "Catat Transaksi"}</DialogTitle>
            <DialogDescription className="text-xs">
              Tulis manual atau pakai isian otomatis dari satu kalimat.
            </DialogDescription>
          </DialogHeader>
          {/* AI quick fill */}
          {!editTx && (
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAiFill()
                    }
                  }}
                  placeholder="Coba: kopi 25rb pakai gopay"
                  className="pl-9 h-10 text-sm bg-background/60"
                />
              </div>
              <Button size="sm" className="h-10 px-3" onClick={handleAiFill} disabled={aiLoading || !aiText.trim()}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Isi"}
              </Button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Jenis */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "h-10 rounded-lg text-sm font-semibold transition-all",
                  type === t
                    ? t === "income"
                      ? "bg-income/20 text-income shadow-sm"
                      : "bg-expense/20 text-expense shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "income" ? "＋ Pemasukan" : "− Pengeluaran"}
              </button>
            ))}
          </div>

          {/* Nominal */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nominal</label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 h-14 focus-within:ring-2 focus-within:ring-ring/50 transition">
              <span className="text-lg font-semibold text-muted-foreground">Rp</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="0"
                className="flex-1 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
                aria-label="Nominal transaksi"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickAmounts.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    const cur = Number(amount.replace(/\D/g, "")) || 0
                    setAmount(formatAmountInput(String(cur + v)))
                  }}
                  className="h-8 px-3 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition"
                >
                  +{v >= 1_000_000 ? `${v / 1_000_000}jt` : `${v / 1000}rb`}
                </button>
              ))}
              {amount && (
                <button
                  onClick={() => setAmount("")}
                  className="h-8 px-3 rounded-full border border-border text-xs font-medium text-expense hover:bg-expense/10 transition"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Kategori</label>
            <div className="mt-1.5 grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] leading-tight transition-all",
                    categoryId === c.id
                      ? "border-primary bg-primary/10 text-foreground font-semibold"
                      : "border-border text-muted-foreground hover:bg-accent/60"
                  )}
                >
                  <span
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-background"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name.charAt(0)}
                  </span>
                  <span className="line-clamp-2 text-center">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dompet & tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dompet</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setWalletId(w.id)}
                    className={cn(
                      "h-9 px-3 rounded-full border text-xs font-medium transition-all",
                      walletId === w.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/60"
                    )}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 h-9 bg-background/60"
              />
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Keterangan</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "income" ? "misal: Gaji November" : "misal: Makan siang geprek"}
              className="mt-1.5 h-10 bg-background/60"
            />
          </div>

          {/* Aksi */}
          <div className="flex gap-2 pt-1 pb-2">
            {editTx && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleDelete}
                className="text-expense border-expense/30 hover:bg-expense/10"
                aria-label="Hapus transaksi"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="lg"
              className="flex-1 font-bold"
              onClick={handleSave}
              disabled={save.isPending}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editTx ? "Simpan Perubahan" : "Simpan Transaksi"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
