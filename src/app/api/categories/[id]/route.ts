import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// DELETE /api/categories/[id] — hapus kategori milik perangkat ini
// (transaksi ikut terhapus via cascade)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await resolveUserId(req)
    const { id } = await params

    const owned = await db.category.findFirst({ where: { id, userId } })
    if (!owned) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 })
    }

    const txCount = await db.transaction.count({ where: { categoryId: owned.id } })
    await db.category.delete({ where: { id: owned.id } })
    return NextResponse.json({ ok: true, deletedTransactions: txCount })
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 })
  }
}
