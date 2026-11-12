import { NextResponse } from "next/server"
import { isSeeded, seedDemoData, resetDemoData } from "@/lib/seed"
import { resolveUserId, getUserName } from "@/lib/session"

// GET /api/seed — cek apakah data demo untuk perangkat ini sudah ada
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const [seeded, name] = await Promise.all([isSeeded(userId), getUserName(userId)])
    return NextResponse.json({ seeded, name })
  } catch (error) {
    console.error("Seed check error:", error)
    return NextResponse.json({ seeded: false, name: "" })
  }
}

// POST /api/seed — isi data demo untuk perangkat ini (force = reset total)
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json().catch(() => ({}))
    const force = Boolean(body?.force)
    if (force) {
      await resetDemoData(userId)
      return NextResponse.json({ ok: true, reset: true })
    }
    if (!(await isSeeded(userId))) {
      await seedDemoData(userId)
      return NextResponse.json({ ok: true, created: true })
    }
    return NextResponse.json({ ok: true, created: false })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ ok: false, error: "Gagal memuat data demo" }, { status: 500 })
  }
}
