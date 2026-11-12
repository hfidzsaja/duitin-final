import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// GET /api/session — info profil perangkat ini (tanpa login)
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, createdAt: true },
    })
    return NextResponse.json({ name: user?.name ?? "", memberSince: user?.createdAt ?? null })
  } catch (error) {
    console.error("GET /api/session error:", error)
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 })
  }
}

// PATCH /api/session — simpan nama panggilan pengguna
export async function PATCH(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const name = String(body.name ?? "").trim().slice(0, 40)
    await db.user.update({ where: { id: userId }, data: { name } })
    return NextResponse.json({ ok: true, name })
  } catch (error) {
    console.error("PATCH /api/session error:", error)
    return NextResponse.json({ error: "Gagal menyimpan profil" }, { status: 500 })
  }
}
