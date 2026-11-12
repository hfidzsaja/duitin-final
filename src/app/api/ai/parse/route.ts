import { NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"
import { db } from "@/lib/db"
import { resolveUserId } from "@/lib/session"

export const maxDuration = 60

// POST /api/ai/parse — ubah kalimat natural jadi transaksi terstruktur
// Contoh input: "makan siang geprek 25rb pakai gopay"
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const text = String(body.text ?? "").trim()
    if (!text) return NextResponse.json({ error: "Teks kosong" }, { status: 400 })

    const userId = await resolveUserId(req)
    const [categories, wallets] = await Promise.all([
      db.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
      db.wallet.findMany({ where: { userId }, select: { id: true, name: true } }),
    ])

    const catList = categories.map((c) => `${c.name} (${c.type})`).join(", ")
    const walletList = wallets.map((w) => w.name).join(", ")

    // Coba parse via AI dulu
    let parsed: {
      type: "income" | "expense"
      amount: number
      description: string
      categoryName: string
      walletName: string
    } | null = null

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content: `Kamu parser transaksi keuangan Bahasa Indonesia. Ubah kalimat pengguna menjadi JSON MURNI (tanpa teks lain, tanpa markdown).

Kategori tersedia: ${catList}
Dompet tersedia: ${walletList}

Aturan:
- "rb"/"ribu" = x1000, "jt"/"juta" = x1000000. Contoh: 25rb = 25000, 1.5jt = 1500000.
- type: "expense" untuk pengeluaran, "income" untuk pemasukan (gajian, terima, bonus, dll).
- description: nama singkat transaksi.
- categoryName: paling cocok dari daftar kategori (ikuti type-nya).
- walletName: dompet yang disebut, default "BCA" jika tidak disebut.
- Jika nominal tidak disebut sama sekali, set amount = 0.

Format: {"type":"expense","amount":25000,"description":"Makan siang geprek","categoryName":"Makan & Minum","walletName":"GoPay"}`,
          },
          { role: "user", content: text },
        ],
        thinking: { type: "disabled" },
      })
      const raw = completion.choices[0]?.message?.content?.trim() ?? ""
      const jsonStr = raw.replace(/```json?|```/g, "").trim()
      const obj = JSON.parse(jsonStr)
      if (obj && (obj.type === "income" || obj.type === "expense") && Number(obj.amount) >= 0) {
        const cat = categories.find((c) => c.name === obj.categoryName && c.type === obj.type)
          ?? categories.find((c) => c.name === obj.categoryName)
          ?? categories.find((c) => c.type === obj.type)
        const wallet = wallets.find((w) => w.name === obj.walletName) ?? wallets[0]
        if (cat && wallet) {
          parsed = {
            type: obj.type,
            amount: Number(obj.amount),
            description: String(obj.description || text).slice(0, 80),
            categoryName: cat.name,
            walletName: wallet.name,
          }
        }
      }
    } catch (aiError) {
      console.error("AI parse failed, fallback regex:", aiError)
    }

    // Fallback: regex sederhana jika AI gagal
    if (!parsed) {
      let amount = 0
      const rb = text.match(/(\d+[.,]?\d*)\s*(rb|ribu|k\b)/i)
      const jt = text.match(/(\d+[.,]?\d*)\s*(jt|juta)/i)
      const plain = text.replace(/rp/gi, "").match(/(?:^|\s)(\d{4,9})(?:\s|$|[.,]\s)/)
      if (jt) amount = Math.round(parseFloat(jt[1].replace(",", ".")) * 1000000)
      else if (rb) amount = Math.round(parseFloat(rb[1].replace(",", ".")) * 1000)
      else if (plain) amount = Number(plain[1])

      const incomeWords = /(gaji|terima|pemasukan|bonus| THR |dividen|dibayar|pendapatan|setor)/i
      const type = incomeWords.test(text) ? "income" : "expense"
      const cat = categories.find((c) => c.type === type)
      const wallet = wallets[0]
      if (cat && wallet) {
        parsed = {
          type,
          amount,
          description: text.slice(0, 80),
          categoryName: cat.name,
          walletName: wallet.name,
        }
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: "Tidak bisa membaca transaksi" }, { status: 422 })
    }

    // Lengkapi id kategori & dompet
    const category = categories.find((c) => c.name === parsed!.categoryName && c.type === parsed!.type)
      ?? categories.find((c) => c.name === parsed!.categoryName)
    const wallet = wallets.find((w) => w.name === parsed!.walletName)

    return NextResponse.json({
      ...parsed,
      categoryId: category?.id ?? null,
      walletId: wallet?.id ?? null,
      amount: parsed.amount,
    })
  } catch (error) {
    console.error("POST /api/ai/parse error:", error)
    return NextResponse.json({ error: "Gagal memproses teks" }, { status: 500 })
  }
}
