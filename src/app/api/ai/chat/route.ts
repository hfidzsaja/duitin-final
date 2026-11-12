import { NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

const fmtID = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n))

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = String(body.message ?? "").trim()
    if (!message) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 })
    }
    const history = Array.isArray(body.history)
      ? body.history
          .filter((h: { role?: string; content?: string }) => h?.role && h?.content)
          .slice(-8)
          .map((h: { role: string; content: string }) => ({ role: h.role, content: String(h.content).slice(0, 2000) }))
      : []

    // ---------- Kumpulkan konteks keuangan pengguna (per perangkat) ----------
    const userId = await resolveUserId(req)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [wallets, monthTx, budgets, goals, debts] = await Promise.all([
      db.wallet.findMany({ where: { userId }, include: { transactions: { select: { type: true, amount: true } } } }),
      db.transaction.findMany({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        include: {
          category: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      }),
      db.budget.findMany({
        where: {
          userId,
          month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        },
        include: { category: { select: { name: true } } },
      }),
      db.savingsGoal.findMany({ where: { userId } }),
      db.debt.findMany({ where: { userId, settled: false } }),
    ])

    const walletLines = wallets
      .map((w) => {
        const bal =
          w.initialBalance + w.transactions.reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0)
        return `- ${w.name} (${w.type}): Rp${fmtID(bal)}`
      })
      .join("\n")
    const totalBalance = wallets.reduce(
      (a, w) => a + w.initialBalance + w.transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0),
      0
    )

    const income = monthTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0)
    const expense = monthTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0)

    // Pengeluaran per kategori bulan ini
    const catTotals = new Map<string, number>()
    for (const t of monthTx) {
      if (t.type !== "expense") continue
      catTotals.set(t.category.name, (catTotals.get(t.category.name) ?? 0) + t.amount)
    }
    const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    // 10 transaksi terbaru
    const recentTx = monthTx
      .slice(0, 12)
      .map((t) => `- ${new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}: ${t.type === "income" ? "+" : "-"}Rp${fmtID(t.amount)} — ${t.description} (${t.category.name})`)
      .join("\n")

    const budgetLines = budgets
      .map((b) => {
        const spent = catTotals.get(b.category.name) ?? 0
        return `- ${b.category.name}: anggaran Rp${fmtID(b.amount)}, terpakai Rp${fmtID(spent)} (${Math.round((spent / b.amount) * 100)}%)${spent > b.amount ? " ⚠ LEBIH" : ""}`
      })
      .join("\n")

    const goalLines = goals
      .map((g) => `- ${g.name}: Rp${fmtID(g.currentAmount)}/${fmtID(g.targetAmount)} (${Math.round((g.currentAmount / g.targetAmount) * 100)}%)`)
      .join("\n")

    const debtLines = debts
      .map((d) => `- ${d.type === "debt" ? "HUTANG ke" : "PIUTANG dari"} ${d.person}: sisa Rp${fmtID(d.amount - d.paidAmount)} dari Rp${fmtID(d.amount)}${d.dueDate ? `, jatuh tempo ${new Date(d.dueDate).toLocaleDateString("id-ID")}` : ""}`)
      .join("\n")

    const context = `[DATA KEUANGAN PENGGUNA — ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}]
Total saldo semua dompet: Rp${fmtID(totalBalance)}
Dompet:
${walletLines || "- (tidak ada dompet)"}

Bulan ini (${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}):
Pemasukan: Rp${fmtID(income)}
Pengeluaran: Rp${fmtID(expense)}
Sisa: Rp${fmtID(income - expense)}
Rincian pengeluaran terbesar: ${topCats.map(([n, v]) => `${n} Rp${fmtID(v)}`).join(", ") || "-"}

Anggaran bulan ini:
${budgetLines || "- (belum diatur)"}

Target tabungan:
${goalLines || "- (belum ada)"}

Hutang/piutang aktif:
${debtLines || "- tidak ada"}

Transaksi terbaru:
${recentTx || "- (belum ada)"}]`

    const systemPrompt = `Kamu adalah "Cuan", asisten keuangan pribadi berbahasa Indonesia yang ramah, hangat, dan suportif di aplikasi Duitin.

ATURAN PENTING:
1. SELALU jawab dalam Bahasa Indonesia yang santai tapi profesional (pakai "kamu").
2. Gunakan HANYA data dari [DATA KEUANGAN PENGGUNA] di bawah. Jangan mengarang angka. Jika data tidak tersedia, katakan jujur.
3. Format nominal: Rp1.500.000 atau Rp25rb untuk ringkas.
4. Jawaban RINGKAS dan TEGAS (maksimal ~180 kata), langsung ke poin. Boleh pakai emoji secukupnya (💰⚠️✅📊) untuk mempercantik.
5. Berikan saran AKTIF dan SPESIFIK, bukan teori umum. Contoh: sebutkan kategori persis, nominal persis, langkah konkret.
6. Jika pengguna bertanya "berapa saldo", "pengeluaran bulan ini", dll — jawab langsung dengan angka dari data.
7. Jika pengguna tampak berjudi/boros berlebihan, beri nasihat bijak secara sehat tanpa menggurui.
8. Tutup jawaban dengan 1 pertanyaan lanjutan atau ajakan kecil bila relevan.

${context}`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      thinking: { type: "disabled" },
    })

    const reply = completion.choices[0]?.message?.content
    if (!reply || !reply.trim()) {
      return NextResponse.json({ error: "Asisten sedang tidak merespons, coba lagi" }, { status: 502 })
    }

    return NextResponse.json({ reply: reply.trim() })
  } catch (error) {
    console.error("POST /api/ai/chat error:", error)
    return NextResponse.json({ error: "Asisten sedang sibuk, coba lagi sebentar" }, { status: 500 })
  }
}
