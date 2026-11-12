import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// PATCH /api/transactions/[id] — hanya transaksi milik perangkat ini
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params
    const body = await req.json()

    const owned = await db.transaction.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.amount !== undefined) {
      const amount = Number(body.amount)
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 })
      }
      data.amount = amount
    }
    if (body.type !== undefined && ["income", "expense"].includes(body.type)) data.type = body.type
    if (body.description !== undefined) data.description = String(body.description).trim()
    if (body.date !== undefined) data.date = new Date(body.date)
    if (body.walletId !== undefined) {
      const w = await db.wallet.findFirst({ where: { id: body.walletId, userId } })
      if (!w) return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 })
      data.walletId = body.walletId
    }
    if (body.categoryId !== undefined) {
      const c = await db.category.findFirst({ where: { id: body.categoryId, userId } })
      if (!c) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 })
      data.categoryId = body.categoryId
    }

    const transaction = await db.transaction.update({
      where: { id: owned.id },
      data,
      include: {
        wallet: { select: { id: true, name: true, icon: true, color: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    })
    return NextResponse.json(transaction)
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error)
    return NextResponse.json({ error: "Gagal mengubah transaksi" }, { status: 500 })
  }
}

// DELETE /api/transactions/[id] — hanya transaksi milik perangkat ini
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params

    const owned = await db.transaction.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    await db.transaction.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 })
  }
}
