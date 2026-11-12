import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// GET /api/debts — daftar hutang & piutang (per perangkat)
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const debts = await db.debt.findMany({
      where: { userId },
      orderBy: [{ settled: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    })
    return NextResponse.json(debts)
  } catch (error) {
    console.error("GET /api/debts error:", error)
    return NextResponse.json({ error: "Gagal memuat hutang & piutang" }, { status: 500 })
  }
}

// POST /api/debts — catat hutang baru / piutang baru
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const person = String(body.person ?? "").trim()
    const amount = Number(body.amount)
    const type = body.type === "receivable" ? "receivable" : "debt"
    if (!person) return NextResponse.json({ error: "Nama pihak wajib diisi" }, { status: 400 })
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 })
    }

    const debt = await db.debt.create({
      data: {
        userId,
        type,
        person,
        amount,
        paidAmount: Number(body.paidAmount) || 0,
        note: String(body.note ?? "").trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    })
    return NextResponse.json(debt, { status: 201 })
  } catch (error) {
    console.error("POST /api/debts error:", error)
    return NextResponse.json({ error: "Gagal mencatat hutang/piutang" }, { status: 500 })
  }
}
