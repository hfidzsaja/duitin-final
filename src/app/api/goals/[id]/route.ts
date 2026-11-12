import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// PATCH /api/goals/[id] — update target / setor dana (amount = tambahan setor)
// Hanya target milik perangkat ini.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params
    const body = await req.json()

    const goal = await db.savingsGoal.findFirst({ where: { id, userId } })
    if (!goal) return NextResponse.json({ error: "Target tidak ditemukan" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.targetAmount !== undefined) {
      const t = Number(body.targetAmount)
      if (!t || t <= 0) return NextResponse.json({ error: "Nominal target tidak valid" }, { status: 400 })
      data.targetAmount = t
    }
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
    if (body.icon !== undefined) data.icon = body.icon
    if (body.color !== undefined) data.color = body.color

    if (body.deposit !== undefined) {
      // setor (positif) atau tarik (negatif) dana
      const deposit = Number(body.deposit)
      if (!deposit) return NextResponse.json({ error: "Nominal setor tidak valid" }, { status: 400 })
      const next = goal.currentAmount + deposit
      if (next < 0) return NextResponse.json({ error: "Saldo target tidak cukup" }, { status: 400 })
      data.currentAmount = next
    } else if (body.currentAmount !== undefined) {
      data.currentAmount = Number(body.currentAmount)
    }

    const updated = await db.savingsGoal.update({ where: { id: goal.id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/goals/[id] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui target" }, { status: 500 })
  }
}

// DELETE /api/goals/[id] — hanya target milik perangkat ini
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params

    const owned = await db.savingsGoal.findFirst({ where: { id, userId } })
    if (!owned) return NextResponse.json({ error: "Target tidak ditemukan" }, { status: 404 })

    await db.savingsGoal.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus target" }, { status: 500 })
  }
}
