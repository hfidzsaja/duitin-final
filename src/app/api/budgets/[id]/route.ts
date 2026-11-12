import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// PATCH /api/budgets/[id] — hanya anggaran milik perangkat ini
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params
    const body = await req.json()

    const owned = await db.budget.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Anggaran tidak ditemukan" }, { status: 404 })
    }

    const amount = Number(body.amount)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Nominal anggaran harus lebih dari 0" }, { status: 400 })
    }
    const budget = await db.budget.update({
      where: { id: owned.id },
      data: { amount },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })
    return NextResponse.json(budget)
  } catch (error) {
    console.error("PATCH /api/budgets/[id] error:", error)
    return NextResponse.json({ error: "Gagal mengubah anggaran" }, { status: 500 })
  }
}

// DELETE /api/budgets/[id] — hanya anggaran milik perangkat ini
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params

    const owned = await db.budget.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Anggaran tidak ditemukan" }, { status: 404 })
    }

    await db.budget.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/budgets/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus anggaran" }, { status: 500 })
  }
}
