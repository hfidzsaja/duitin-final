import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

// GET /api/goals — daftar target tabungan (per perangkat)
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const goals = await db.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
    return NextResponse.json(goals)
  } catch (error) {
    console.error("GET /api/goals error:", error)
    return NextResponse.json({ error: "Gagal memuat target tabungan" }, { status: 500 })
  }
}

// POST /api/goals — buat target baru
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    const targetAmount = Number(body.targetAmount)
    if (!name) return NextResponse.json({ error: "Nama target wajib diisi" }, { status: 400 })
    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json({ error: "Nominal target harus lebih dari 0" }, { status: 400 })
    }

    const goal = await db.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount,
        currentAmount: Number(body.currentAmount) || 0,
        deadline: body.deadline ? new Date(body.deadline) : null,
        icon: body.icon || "target",
        color: body.color || "#10b981",
      },
    })
    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error("POST /api/goals error:", error)
    return NextResponse.json({ error: "Gagal membuat target tabungan" }, { status: 500 })
  }
}
