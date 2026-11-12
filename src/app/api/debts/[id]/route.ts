import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// PATCH /api/debts/[id] — update / bayar cicilan (pay = tambahan pembayaran)
// Hanya data milik perangkat ini.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params
    const body = await req.json()

    const debt = await db.debt.findFirst({ where: { id, userId } })
    if (!debt) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.person !== undefined) data.person = String(body.person).trim()
    if (body.note !== undefined) data.note = String(body.note).trim()
    if (body.amount !== undefined) {
      const a = Number(body.amount)
      if (!a || a <= 0) return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 })
      data.amount = a
    }
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

    if (body.pay !== undefined) {
      const pay = Number(body.pay)
      if (!pay || pay <= 0) return NextResponse.json({ error: "Nominal bayar tidak valid" }, { status: 400 })
      const next = Math.min(debt.paidAmount + pay, debt.amount)
      data.paidAmount = next
      data.settled = next >= debt.amount
    } else if (body.settled !== undefined) {
      data.settled = Boolean(body.settled)
      if (body.settled) data.paidAmount = debt.amount
      else if (debt.paidAmount >= debt.amount) data.paidAmount = 0
    } else if (body.paidAmount !== undefined) {
      const p = Math.max(0, Math.min(Number(body.paidAmount), debt.amount))
      data.paidAmount = p
      data.settled = p >= debt.amount
    }

    const updated = await db.debt.update({ where: { id: debt.id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/debts/[id] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui data" }, { status: 500 })
  }
}

// DELETE /api/debts/[id] — hanya data milik perangkat ini
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params

    const owned = await db.debt.findFirst({ where: { id, userId } })
    if (!owned) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    await db.debt.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/debts/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 })
  }
}
