"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  useWallets,
  useCategories,
  useCreateWallet,
  useUpdateWallet,
  useDeleteWallet,
  useCreateCategory,
  useDeleteCategory,
  useRunSeed,
  useSession,
  useUpdateName,
} from "./queries"
import { shortDeviceId } from "@/lib/device"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Loader2, Plus, Trash2, Landmark, Smartphone, Coins, RefreshCcw, Pencil, Info, BookOpen, UserRound, Share2, MonitorSmartphone, Database } from "lucide-react"

const WALLET_TYPES = [
  { id: "cash", label: "Tunai", icon: Coins },
  { id: "bank", label: "Bank", icon: Landmark },
  { id: "ewallet", label: "E-Wallet", icon: Smartphone },
] as const

const W_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#f97316", "#ec4899", "#8b5cf6"]
const C_COLORS = ["#f97316", "#8b5cf6", "#ec4899", "#f59e0b", "#d946ef", "#ef4444", "#06b6d4", "#a3e635", "#2dd4bf", "#10b981"]

export function PageWallets() {
  const { toast } = useToast()
  const { data: wallets = [], isLoading } = useWallets()
  const { data: categories = [] } = useCategories()
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const deleteWallet = useDeleteWallet()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const runSeed = useRunSeed()
  const { data: session } = useSession()
  const updateName = useUpdateName()

  // dialog dompet
  const [wOpen, setWOpen] = useState(false)
  const [wEdit, setWEdit] = useState<string | null>(null)
  const [wName, setWName] = useState("")
  const [wType, setWType] = useState<"cash" | "bank" | "ewallet">("cash")
  const [wBalance, setWBalance] = useState("")
  const [wColor, setWColor] = useState(W_COLORS[0])

  // dialog kategori
  const [cOpen, setCOpen] = useState(false)
  const [cName, setCName] = useState("")
  const [cType, setCType] = useState<"expense" | "income">("expense")
  const [cColor, setCColor] = useState(C_COLORS[0])

  // reset
  const [resetOpen, setResetOpen] = useState(false)

  // profil & panduan
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const profileName = nameDraft ?? session?.name ?? ""

  async function saveName() {
    if (nameDraft === null) return
    const trimmed = nameDraft.trim()
    if (trimmed === (session?.name ?? "")) {
      setNameDraft(null)
      return
    }
    try {
      await updateName.mutateAsync(trimmed)
      toast({ title: "Profil disimpan ✅" })
      setNameDraft(null)
    } catch {
      toast({ title: "Gagal menyimpan profil", variant: "destructive" })
    }
  }

  function openNewWallet() {
    setWEdit(null)
    setWName("")
    setWType("cash")
    setWBalance("")
    setWColor(W_COLORS[wallets.length % W_COLORS.length])
    setWOpen(true)
  }
  function openEditWallet(id: string) {
    const w = wallets.find((x) => x.id === id)
    if (!w) return
    setWEdit(id)
    setWName(w.name)
    setWType(w.type)
    setWBalance(new Intl.NumberFormat("id-ID").format(Math.max(0, Math.round(w.balance))))
    setWColor(w.color)
    setWOpen(true)
  }

  async function saveWallet() {
    if (!wName.trim()) return toast({ title: "Nama dompet wajib diisi", variant: "destructive" })
    try {
      if (wEdit) {
        // Saldo diset ulang: hitung selisih sebagai initialBalance baru
        const w = wallets.find((x) => x.id === wEdit)
        const deltaTx = (w?.balance ?? 0) - (w?.initialBalance ?? 0)
        await updateWallet.mutateAsync({
          id: wEdit,
          name: wName.trim(),
          type: wType,
          initialBalance: Math.max(0, Number(wBalance.replace(/\D/g, "")) - deltaTx),
        })
        toast({ title: "Dompet diperbarui ✅" })
      } else {
        await createWallet.mutateAsync({
          name: wName.trim(),
          type: wType,
          color: wColor,
          initialBalance: Number(wBalance.replace(/\D/g, "")),
        })
        toast({ title: "Dompet baru ditambahkan ✅" })
      }
      setWOpen(false)
    } catch (e) {
      toast({ title: "Gagal menyimpan dompet", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0

  return (
    <div className="space-y-6">
      {/* ===== Dompet ===== */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm font-bold">Dompet & Saldo</h2>
          <Button size="sm" variant="outline" className="h-8" onClick={openNewWallet}>
            <Plus className="h-3.5 w-3.5" /> Dompet
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : (
          <div className="space-y-2.5">
            {wallets.map((w) => (
              <Card key={w.id} className="glass-card border-border/50 rounded-2xl py-0">
                <div className="flex items-center gap-3 p-4">
                  <span
                    className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${w.color}22`, color: w.color }}
                    aria-hidden
                  >
                    {w.type === "bank" ? <Landmark className="h-5 w-5" /> : w.type === "ewallet" ? <Smartphone className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2">
                      {w.name}
                      {w.isDefault && <span className="text-[10px] font-bold bg-primary/15 text-primary rounded-full px-2 py-0.5">Utama</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">{w.type === "ewallet" ? "E-Wallet" : w.type === "cash" ? "Tunai" : "Bank"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold tabular-nums">{formatRupiah(w.balance)}</p>
                    <p className="text-[10px] text-muted-foreground">saldo saat ini</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEditWallet(w.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition" aria-label={`Ubah ${w.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Hapus dompet "${w.name}"? SEMUA transaksi di dalamnya juga terhapus.`)) return
                        try {
                          await deleteWallet.mutateAsync(w.id)
                          toast({ title: "Dompet dihapus" })
                        } catch {
                          toast({ title: "Gagal menghapus dompet", variant: "destructive" })
                        }
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-expense hover:bg-expense/10 transition"
                      aria-label={`Hapus ${w.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ===== Kategori ===== */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm font-bold">Kategori</h2>
          <Button size="sm" variant="outline" className="h-8" onClick={() => { setCName(""); setCType("expense"); setCColor(C_COLORS[0]); setCOpen(true) }}>
            <Plus className="h-3.5 w-3.5" /> Kategori
          </Button>
        </div>
        {(["expense", "income"] as const).map((t) => (
          <div key={t} className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">{t === "income" ? "Pemasukan" : "Pengeluaran"}</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.filter((c) => c.type === t).map((c) => (
                <span key={c.id} className="group inline-flex items-center gap-1.5 h-8 pl-1 pr-1.5 rounded-full border border-border bg-card/60 text-xs font-medium">
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-background" style={{ background: c.color }}>
                    {c.name.charAt(0)}
                  </span>
                  {c.name}
                  <button
                    onClick={async () => {
                      if (!confirm(`Hapus kategori "${c.name}"? Transaksi dengan kategori ini ikut terhapus.`)) return
                      try {
                        await deleteCategory.mutateAsync(c.id)
                        toast({ title: "Kategori dihapus" })
                      } catch {
                        toast({ title: "Gagal menghapus kategori", variant: "destructive" })
                      }
                    }}
                    className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-expense transition"
                    aria-label={`Hapus kategori ${c.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ===== Profil & Panduan ===== */}
      <section>
        <h2 className="text-sm font-bold mb-2.5 px-1">Profil Pengguna</h2>
        <Card className="glass-card border-border/50 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0" aria-hidden>
                <UserRound className="h-5 w-5 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <Input
                  value={profileName}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, 40))}
                  onBlur={saveName}
                  placeholder="Nama panggilan (misal: Budi)"
                  className="h-10 bg-background/60 font-semibold"
                  aria-label="Nama panggilan"
                />
              </div>
              {updateName.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 shrink-0" />
              ID perangkat: <b className="text-foreground font-mono">{shortDeviceId() || "…"}</b> — data di perangkat ini terpisah dari pengguna lain, tanpa perlu login.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setGuideOpen(true)}>
              <BookOpen className="h-4 w-4" /> Panduan untuk Pengguna Baru
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ===== Zona data ===== */}
      <section>
        <h2 className="text-sm font-bold mb-2.5 px-1">Kelola Data</h2>
        <Card className="glass-card border-border/50 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p>
                Data demo milik perangkat ini saja. Muat ulang data demo untuk mengembalikan ke contoh awal
                (semua catatanmu di perangkat ini akan diganti dengan data demo baru — data pengguna lain tidak terpengaruh).
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full border-expense/30 text-expense hover:bg-expense/10"
              onClick={() => setResetOpen(true)}
            >
              <RefreshCcw className="h-4 w-4" /> Muat Ulang Data Demo
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ===== Dialog Dompet ===== */}
      <Dialog open={wOpen} onOpenChange={setWOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{wEdit ? "Ubah Dompet" : "Dompet Baru"}</DialogTitle>
            <DialogDescription>Pisahkan uang per rekening, e-wallet, atau uang tunai.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nama dompet</label>
              <Input value={wName} onChange={(e) => setWName(e.target.value)} placeholder="misal: BCA, GoPay, Tunai" className="mt-1.5 h-10 bg-background/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Jenis</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2 p-1 rounded-xl bg-muted/60">
                {WALLET_TYPES.map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      onClick={() => setWType(t.id)}
                      className={cn("h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition", wType === t.id ? "bg-card text-foreground shadow" : "text-muted-foreground")}
                    >
                      <Icon className="h-3.5 w-3.5" /> {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {wEdit ? "Saldo saat ini" : "Saldo awal (opsional)"}
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 h-12">
                <span className="font-semibold text-muted-foreground">Rp</span>
                <input
                  inputMode="numeric"
                  value={wBalance}
                  onChange={(e) => setWBalance(new Intl.NumberFormat("id-ID").format(Number(e.target.value.replace(/\D/g, "").slice(0, 12)) || 0).replace(/^0(?=.)/, ""))}
                  placeholder="0"
                  className="flex-1 bg-transparent text-lg font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
                  aria-label="Saldo"
                />
              </div>
            </div>
            {!wEdit && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Warna</label>
                <div className="mt-1.5 flex gap-2">
                  {W_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setWColor(c)}
                      className={cn("h-8 w-8 rounded-full transition", wColor === c ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : "opacity-60 hover:opacity-100")}
                      style={{ background: c }}
                      aria-label={`Warna ${c}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={saveWallet} disabled={createWallet.isPending || updateWallet.isPending}>
              {(createWallet.isPending || updateWallet.isPending) && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Dompet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Kategori ===== */}
      <Dialog open={cOpen} onOpenChange={setCOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Kategori Baru</DialogTitle>
            <DialogDescription>Buat kategori sesuai gaya hidupmu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCType(t)}
                  className={cn("h-9 rounded-lg text-xs font-semibold transition", cType === t ? (t === "income" ? "bg-income/20 text-income" : "bg-expense/20 text-expense") : "text-muted-foreground")}
                >
                  {t === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nama kategori</label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="misal: Kopi, Cicilan, Crypto" className="mt-1.5 h-10 bg-background/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Warna</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {C_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCColor(c)}
                    className={cn("h-8 w-8 rounded-full transition", cColor === c ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : "opacity-60 hover:opacity-100")}
                    style={{ background: c }}
                    aria-label={`Warna ${c}`}
                  />
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                if (!cName.trim()) return toast({ title: "Nama kategori wajib diisi", variant: "destructive" })
                try {
                  await createCategory.mutateAsync({ name: cName.trim(), type: cType, color: cColor })
                  toast({ title: "Kategori ditambahkan ✅" })
                  setCOpen(false)
                } catch (e) {
                  toast({ title: "Gagal menambah kategori", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
                }
              }}
              disabled={createCategory.isPending}
            >
              {createCategory.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Kategori
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Reset ===== */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Muat Ulang Data Demo?</DialogTitle>
            <DialogDescription>
              Semua catatanmu di perangkat ini akan dihapus dan diganti data demo baru. Tindakan ini tidak bisa dibatalkan
              dan tidak memengaruhi data pengguna lain.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setResetOpen(false)}>Batal</Button>
            <Button
              className="bg-expense text-white hover:bg-expense/85"
              onClick={async () => {
                try {
                  await runSeed.mutateAsync(true)
                  toast({ title: "Data demo dimuat ulang 🔄" })
                  setResetOpen(false)
                } catch {
                  toast({ title: "Gagal memuat data demo", variant: "destructive" })
                }
              }}
              disabled={runSeed.isPending}
            >
              {runSeed.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Ya, Muat Ulang
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Panduan Pengguna ===== */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Panduan untuk Setiap Pengguna</DialogTitle>
            <DialogDescription>
              Duitin bisa dipakai bersama oleh banyak orang — data masing-masing tetap terpisah, tanpa login.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3">
            {[
              {
                icon: Share2,
                title: "1. Bagikan tautan aplikasi",
                body: "Kirim alamat/URL aplikasi ini ke setiap orang (misalnya lewat WhatsApp). Tidak perlu membuat akun atau kata sandi.",
              },
              {
                icon: MonitorSmartphone,
                title: "2. Buka di perangkat masing-masing",
                body: "Setiap orang membuka tautan dari browser HP/laptopnya sendiri. Saat pertama dibuka, data demo otomatis dibuat khusus untuknya.",
              },
              {
                icon: UserRound,
                title: "3. Isi nama panggilan (opsional)",
                body: "Di halaman Dompet & Pengaturan, isi nama panggilan agar sapaan di Beranda lebih personal.",
              },
              {
                icon: Smartphone,
                title: "4. Pasang seperti aplikasi",
                body: "Di HP: buka menu browser pilih Tambahkan ke layar utama. Duitin akan tampil seperti aplikasi biasa dengan ikon sendiri.",
              },
              {
                icon: Database,
                title: "5. Data otomatis terpisah per perangkat",
                body: "Identitas perangkat disimpan di browser masing-masing, jadi transaksi, anggaran, dan target tabunganmu tidak tercampur dengan orang lain. Jangan hapus data situs di browser agar data tidak hilang.",
              },
              {
                icon: RefreshCcw,
                title: "6. Mulai dari nol kapan saja",
                body: "Setelah mencoba data demo, tekan Muat Ulang Data Demo untuk mulai bersih dengan catatanmu sendiri.",
              },
            ].map((s) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="flex gap-3">
                  <span className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0" aria-hidden>
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-bold leading-tight">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">
            Catatan: karena identitas menempel di browser perangkat, membuka aplikasi dari perangkat yang sama berarti
            masuk ke data yang sama. Untuk 2 profil berbeda di 1 HP, gunakan browser atau mode penyamaran yang berbeda.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
