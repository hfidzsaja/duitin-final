import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// PATCH /api/wallets/[id] — ubah dompet (hanya milik perangkat ini)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params
    const body = await req.json()

    const owned = await db.wallet.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.type !== undefined && ["cash", "bank", "ewallet"].includes(body.type)) data.type = body.type
    if (body.icon !== undefined) data.icon = body.icon
    if (body.color !== undefined) data.color = body.color
    if (body.initialBalance !== undefined) data.initialBalance = Number(body.initialBalance) || 0

    const wallet = await db.wallet.update({ where: { id: owned.id }, data })
    return NextResponse.json(wallet)
  } catch (error) {
    console.error("PATCH /api/wallets/[id] error:", error)
    return NextResponse.json({ error: "Gagal mengubah dompet" }, { status: 500 })
  }
}

// DELETE /api/wallets/[id] — hapus dompet beserta transaksinya (hanya milik perangkat ini)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params

    const owned = await db.wallet.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 })
    }

    await db.wallet.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/wallets/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus dompet" }, { status: 500 })
  }
}
