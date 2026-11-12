import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// GET /api/transactions?month=2026-11&type=expense&walletId=&categoryId=&search=&limit=&days=
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const { searchParams } = new URL(req.url)
    const where: Record<string, unknown> = { userId }

    const month = searchParams.get("month") // format 2026-11
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 1)
      where.date = { gte: start, lt: end }
    }

    const days = searchParams.get("days")
    if (days && !month) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - Number(days))
      where.date = { gte: start }
    }

    const type = searchParams.get("type")
    if (type === "income" || type === "expense") where.type = type

    const walletId = searchParams.get("walletId")
    if (walletId) where.walletId = walletId

    const categoryId = searchParams.get("categoryId")
    if (categoryId) where.categoryId = categoryId

    const search = searchParams.get("search")?.trim()
    if (search) where.description = { contains: search.toLowerCase() }

    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000)

    const transactions = await db.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        wallet: { select: { id: true, name: true, icon: true, color: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("GET /api/transactions error:", error)
    return NextResponse.json({ error: "Gagal memuat transaksi" }, { status: 500 })
  }
}

// POST /api/transactions — catat transaksi baru
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const amount = Number(body.amount)
    const type = body.type === "income" ? "income" : "expense"

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 })
    }
    if (!body.walletId || !body.categoryId) {
      return NextResponse.json({ error: "Dompet dan kategori wajib dipilih" }, { status: 400 })
    }

    const [wallet, category] = await Promise.all([
      db.wallet.findFirst({ where: { id: body.walletId, userId } }),
      db.category.findFirst({ where: { id: body.categoryId, userId } }),
    ])
    if (!wallet || !category) {
      return NextResponse.json({ error: "Dompet atau kategori tidak ditemukan" }, { status: 404 })
    }

    const transaction = await db.transaction.create({
      data: {
        userId,
        type,
        amount,
        description: String(body.description ?? "").trim() || (type === "income" ? "Pemasukan" : "Pengeluaran"),
        date: body.date ? new Date(body.date) : new Date(),
        walletId: body.walletId,
        categoryId: body.categoryId,
      },
      include: {
        wallet: { select: { id: true, name: true, icon: true, color: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("POST /api/transactions error:", error)
    return NextResponse.json({ error: "Gagal mencatat transaksi" }, { status: 500 })
  }
}
