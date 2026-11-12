import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// GET /api/categories?search=&type= — daftar kategori (per perangkat)
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim().toLowerCase()
    const type = searchParams.get("type")

    const where: Record<string, unknown> = { userId }
    if (type === "income" || type === "expense") where.type = type
    if (search) where.name = { contains: search }

    const categories = await db.category.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error("GET /api/categories error:", error)
    return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 })
  }
}

// POST /api/categories — tambah kategori
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    const type = body.type === "income" ? "income" : "expense"
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 })
    }
    const exists = await db.category.findFirst({ where: { userId, name, type } })
    if (exists) {
      return NextResponse.json({ error: "Kategori sudah ada" }, { status: 409 })
    }
    const category = await db.category.create({
      data: {
        userId,
        name,
        type,
        icon: body.icon || (type === "income" ? "plus" : "tag"),
        color: body.color || (type === "income" ? "#10b981" : "#f97316"),
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("POST /api/categories error:", error)
    return NextResponse.json({ error: "Gagal menambah kategori" }, { status: 500 })
  }
}
