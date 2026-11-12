import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// GET /api/wallets — daftar dompet dengan saldo terhitung (per perangkat)
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const wallets = await db.wallet.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        transactions: { select: { type: true, amount: true } },
      },
    })

    const result = wallets.map((w) => {
      const delta = w.transactions.reduce(
        (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
        0
      )
      const { transactions: _t, ...rest } = w
      return { ...rest, balance: w.initialBalance + delta }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/wallets error:", error)
    return NextResponse.json({ error: "Gagal memuat dompet" }, { status: 500 })
  }
}

// POST /api/wallets — tambah dompet baru
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    if (!name) {
      return NextResponse.json({ error: "Nama dompet wajib diisi" }, { status: 400 })
    }
    const wallet = await db.wallet.create({
      data: {
        userId,
        name,
        type: ["cash", "bank", "ewallet"].includes(body.type) ? body.type : "cash",
        icon: body.icon || "wallet",
        color: body.color || "#10b981",
        initialBalance: Number(body.initialBalance) || 0,
        isDefault: Boolean(body.isDefault),
      },
    })
    return NextResponse.json(wallet, { status: 201 })
  } catch (error) {
    console.error("POST /api/wallets error:", error)
    return NextResponse.json({ error: "Gagal menambah dompet" }, { status: 500 })
  }
}
