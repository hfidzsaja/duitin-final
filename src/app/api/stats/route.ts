import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
const fmtID = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n))

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() // 0-based

    const monthStart = new Date(y, m, 1)
    const monthEnd = new Date(y, m + 1, 1)

    // ---------- Wallet balances ----------
    const wallets = await db.wallet.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { transactions: { select: { type: true, amount: true } } },
    })
    const walletBalances = wallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      icon: w.icon,
      color: w.color,
      isDefault: w.isDefault,
      balance: w.initialBalance + w.transactions.reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0),
    }))
    const totalBalance = walletBalances.reduce((a, w) => a + w.balance, 0)

    // ---------- This month summary ----------
    const monthTx = await db.transaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      select: { type: true, amount: true, categoryId: true, date: true },
    })
    const income = monthTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0)
    const expense = monthTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0)

    // ---------- Category breakdown (expense, this month) ----------
    const categories = await db.category.findMany({ where: { userId }, select: { id: true, name: true, icon: true, color: true } })
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const catTotals = new Map<string, number>()
    for (const t of monthTx) {
      if (t.type !== "expense") continue
      catTotals.set(t.categoryId, (catTotals.get(t.categoryId) ?? 0) + t.amount)
    }
    const categoryBreakdown = [...catTotals.entries()]
      .map(([id, total]) => ({
        id,
        name: catMap.get(id)?.name ?? "Lainnya",
        icon: catMap.get(id)?.icon ?? "tag",
        color: catMap.get(id)?.color ?? "#10b981",
        total,
      }))
      .sort((a, b) => b.total - a.total)

    // ---------- 6-month trend ----------
    const trendStart = new Date(y, m - 5, 1)
    const trendTx = await db.transaction.findMany({
      where: { userId, date: { gte: trendStart, lt: monthEnd } },
      select: { type: true, amount: true, date: true },
    })
    const trend: { month: string; label: string; income: number; expense: number }[] = []
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - i, 1)
      const key = monthKey(d)
      trend.push({ month: key, label: monthLabels[d.getMonth()], income: 0, expense: 0 })
    }
    const trendIdx = new Map(trend.map((t, i) => [t.month, i]))
    for (const t of trendTx) {
      const key = monthKey(new Date(t.date))
      const i = trendIdx.get(key)
      if (i === undefined) continue
      if (t.type === "income") trend[i].income += t.amount
      else trend[i].expense += t.amount
    }

    // ---------- Budgets this month ----------
    const mk = monthKey(now)
    const budgets = await db.budget.findMany({
      where: { userId, month: mk },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })
    const budgetStatus = budgets.map((b) => {
      const spent = catTotals.get(b.categoryId) ?? 0
      return {
        id: b.id,
        categoryName: b.category.name,
        categoryIcon: b.category.icon,
        categoryColor: b.category.color,
        amount: b.amount,
        spent,
        pct: Math.round((spent / b.amount) * 100),
        over: spent > b.amount,
      }
    })

    // ---------- Financial Health Score (0-100) ----------
    // 1) Rasio menabung 3 bulan terakhir (30 poin)
    const last3Start = new Date(y, m - 3, 1)
    const last3Tx = await db.transaction.findMany({
      where: { userId, date: { gte: last3Start, lt: monthEnd } },
      select: { type: true, amount: true },
    })
    const in3 = last3Tx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0)
    const out3 = last3Tx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0)
    const savingRate = in3 > 0 ? Math.max(0, (in3 - out3) / in3) : 0
    const scoreSaving = Math.round(Math.min(1, savingRate / 0.3) * 30) // 30% saving rate = perfect

    // 2) Disiplin anggaran (25 poin)
    let scoreBudget = 25
    if (budgetStatus.length > 0) {
      const okCount = budgetStatus.filter((b) => !b.over).length
      scoreBudget = Math.round((okCount / budgetStatus.length) * 25)
    }

    // 3) Rasio hutang (20 poin) — hutang aktif vs rata-rata pemasukan bulanan
    const activeDebt = await db.debt.aggregate({
      where: { userId, type: "debt", settled: false },
      _sum: { amount: true },
    })
    const totalDebt = (activeDebt._sum.amount ?? 0)
    const avgMonthlyIncome = in3 / 3
    const debtRatio = avgMonthlyIncome > 0 ? totalDebt / avgMonthlyIncome : 0
    const scoreDebt = Math.round(Math.max(0, 1 - debtRatio / 3) * 20) // 3x income = 0

    // 4) Konsistensi pencatatan (15 poin) — hari mencatat dalam 14 hari terakhir
    const streakStart = new Date(now)
    streakStart.setDate(streakStart.getDate() - 13)
    streakStart.setHours(0, 0, 0, 0)
    const recentDates = new Set(
      (
        await db.transaction.findMany({
          where: { userId, date: { gte: streakStart } },
          select: { date: true },
        })
      ).map((t) => new Date(t.date).toDateString())
    )
    const daysRecorded = recentDates.size
    const scoreStreak = Math.round(Math.min(1, daysRecorded / 10) * 15)

    // 5) Dana darurat (10 poin) — saldo vs pengeluaran bulanan
    const emergencyMonths = expense > 0 ? totalBalance / expense : 2
    const scoreEmergency = Math.round(Math.min(1, emergencyMonths / 3) * 10) // 3x pengeluaran bulanan = aman

    const healthScore = Math.max(0, Math.min(100, scoreSaving + scoreBudget + scoreDebt + scoreStreak + scoreEmergency))
    const healthComponents = [
      { key: "saving", label: "Rasio Menabung", score: scoreSaving, max: 30, detail: `${Math.round(savingRate * 100)}% dari pemasukan tersisa` },
      { key: "budget", label: "Disiplin Anggaran", score: scoreBudget, max: 25, detail: budgetStatus.length ? `${budgetStatus.filter((b) => !b.over).length}/${budgetStatus.length} anggaran aman` : "Belum ada anggaran" },
      { key: "debt", label: "Beban Hutang", score: scoreDebt, max: 20, detail: totalDebt > 0 ? `Hutang aktif ${fmtID(totalDebt)}` : "Tidak ada hutang aktif" },
      { key: "streak", label: "Konsistensi Catat", score: scoreStreak, max: 15, detail: `${daysRecorded} dari 14 hari terakhir` },
      { key: "emergency", label: "Dana Darurat", score: scoreEmergency, max: 10, detail: `${emergencyMonths.toFixed(1)}x pengeluaran bulanan` },
    ]

    // ---------- Smart Insights ----------
    const insights: { id: string; type: "info" | "warning" | "success" | "tip"; title: string; body: string }[] = []

    // Burn rate & proyeksi akhir bulan
    const daysPassed = now.getDate()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const dailyBurn = expense / daysPassed
    const projected = dailyBurn * daysInMonth
    insights.push({
      id: "projection",
      type: "info",
      title: "Proyeksi Akhir Bulan",
      body: `Rata-rata pengeluaranmu ${fmtID(dailyBurn)}/hari. Jika pola ini berlanjut, total pengeluaran bulan ini sekitar Rp${fmtID(projected)}.`,
    })

    // Kategori terbesar
    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0]
      const pct = expense > 0 ? Math.round((top.total / expense) * 100) : 0
      insights.push({
        id: "top-category",
        type: pct > 45 ? "warning" : "info",
        title: `${top.name} Paling Dominan`,
        body: `${pct}% pengeluaran bulan ini (Rp${fmtID(top.total)}) untuk ${top.name.toLowerCase()}.${pct > 45 ? " Coba batasi agar seimbang." : " Masih dalam batas wajar."}`,
      })
    }

    // Budget warning
    const overBudgets = budgetStatus.filter((b) => b.over)
    if (overBudgets.length > 0) {
      insights.push({
        id: "over-budget",
        type: "warning",
        title: `${overBudgets.length} Anggaran Jebol`,
        body: `Anggaran ${overBudgets.map((b) => b.categoryName).join(", ")} sudah terlampaui. Pertimbangkan menahan pengeluaran di kategori ini.`,
      })
    } else if (budgetStatus.length > 0) {
      insights.push({
        id: "budget-ok",
        type: "success",
        title: "Semua Anggaran Aman",
        body: `Kerja bagus! Seluruh ${budgetStatus.length} anggaran bulan ini masih dalam batas.`,
      })
    }

    // Streak
    let streak = 0
    const dayCursor = new Date(now)
    while (recentDates.has(dayCursor.toDateString())) {
      streak++
      dayCursor.setDate(dayCursor.getDate() - 1)
    }
    if (streak >= 2) {
      insights.push({
        id: "streak",
        type: "success",
        title: `Streak ${streak} Hari!`,
        body: `Kamu rajin mencatat ${streak} hari berturut-turut. Konsistensi ini kunci keuangan sehat.`,
      })
    }

    // Hutang jatuh tempo dekat
    const soon = new Date(now)
    soon.setDate(soon.getDate() + 7)
    const dueDebts = await db.debt.findMany({
      where: { userId, settled: false, dueDate: { gte: now, lte: soon } },
      take: 3,
    })
    if (dueDebts.length > 0) {
      insights.push({
        id: "due-debt",
        type: "warning",
        title: "Hutang Segera Jatuh Tempo",
        body: `Ada ${dueDebts.length} kewajiban jatuh tempo ≤7 hari ke ${dueDebts.map((d) => d.person).join(", ")}. Siapkan dananya ya.`,
      })
    }

    return NextResponse.json({
      totalBalance,
      walletBalances,
      monthSummary: { income, expense, net: income - expense },
      categoryBreakdown,
      trend,
      budgetStatus,
      healthScore,
      healthComponents,
      insights,
      dailyBurn,
      projected,
      streak,
    })
  } catch (error) {
    console.error("GET /api/stats error:", error)
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 })
  }
}
