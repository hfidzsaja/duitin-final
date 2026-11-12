import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

function currentMonthKey(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
}

// GET /api/budgets?month=2026-11 — anggaran bulan tertentu + realisasi (per perangkat)
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month") || currentMonthKey()

    const budgets = await db.budget.findMany({
      where: { userId, month },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: { createdAt: "asc" },
    })

    // Hitung realisasi pengeluaran per kategori pada bulan itu
    const [y, m] = month.split("-").map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    const txs = await db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    const spentMap = new Map(txs.map((t) => [t.categoryId, t._sum.amount ?? 0]))

    const result = budgets.map((b) => ({
      ...b,
      spent: spentMap.get(b.categoryId) ?? 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/budgets error:", error)
    return NextResponse.json({ error: "Gagal memuat anggaran" }, { status: 500 })
  }
}

// POST /api/budgets — set/timpa anggaran kategori untuk bulan tertentu
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const amount = Number(body.amount)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Nominal anggaran harus lebih dari 0" }, { status: 400 })
    }
    const month = /^\d{4}-\d{2}$/.test(body.month) ? body.month : currentMonthKey()
    if (!body.categoryId) {
      return NextResponse.json({ error: "Kategori wajib dipilih" }, { status: 400 })
    }

    const category = await db.category.findFirst({ where: { id: body.categoryId, userId } })
    if (!category) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 })
    }

    const budget = await db.budget.upsert({
      where: { categoryId_month: { categoryId: body.categoryId, month } },
      update: { amount },
      create: { userId, month, amount, categoryId: body.categoryId },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error("POST /api/budgets error:", error)
    return NextResponse.json({ error: "Gagal menyimpan anggaran" }, { status: 500 })
  }
}
