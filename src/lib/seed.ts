import { db } from "@/lib/db"

// Simple seeded RNG for deterministic demo data
let rngState = 42
function rand(): number {
  rngState = (rngState * 1103515245 + 12345) % 2147483648
  return rngState / 2147483648
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}
function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step
}

const WALLETS = [
  { name: "BCA", type: "bank", icon: "landmark", color: "#10b981", initialBalance: 2500000, isDefault: true },
  { name: "GoPay", type: "ewallet", icon: "smartphone", color: "#14b8a6", initialBalance: 300000, isDefault: false },
  { name: "Dompet Tunai", type: "cash", icon: "wallet", color: "#f59e0b", initialBalance: 400000, isDefault: false },
  { name: "ShopeePay", type: "ewallet", icon: "shopping-bag", color: "#f97316", initialBalance: 200000, isDefault: false },
]

const INCOME_CATEGORIES = [
  { name: "Gaji", icon: "briefcase", color: "#10b981" },
  { name: "Bonus", icon: "gift", color: "#22c55e" },
  { name: "Freelance", icon: "laptop", color: "#14b8a6" },
  { name: "Investasi", icon: "trending-up", color: "#84cc16" },
]

const EXPENSE_CATEGORIES = [
  { name: "Makan & Minum", icon: "utensils", color: "#f97316" },
  { name: "Transportasi", icon: "car", color: "#8b5cf6" },
  { name: "Belanja", icon: "shopping-cart", color: "#ec4899" },
  { name: "Tagihan", icon: "receipt", color: "#f59e0b" },
  { name: "Hiburan", icon: "clapperboard", color: "#d946ef" },
  { name: "Kesehatan", icon: "heart-pulse", color: "#ef4444" },
  { name: "Rumah Tangga", icon: "home", color: "#06b6d4" },
  { name: "Pendidikan", icon: "book-open", color: "#a3e635" },
  { name: "Donasi", icon: "hand-heart", color: "#2dd4bf" },
]

// Deterministic food/lifestyle descriptions (Indonesian context)
const FOOD = [
  { desc: "Nasi goreng geprek", min: 15000, max: 30000 },
  { desc: "Ayam geprek + es teh", min: 20000, max: 35000 },
  { desc: "Soto ayam", min: 15000, max: 25000 },
  { desc: "Bakso pinggir jalan", min: 12000, max: 20000 },
  { desc: "Kopi susu & roti", min: 18000, max: 35000 },
  { desc: "Makan siang warteg", min: 12000, max: 22000 },
  { desc: "Nasi padang", min: 22000, max: 40000 },
  { desc: "Mie ayam", min: 15000, max: 28000 },
  { desc: "Sate ayam", min: 25000, max: 45000 },
  { desc: "Es kopi / matcha", min: 18000, max: 32000 },
  { desc: "Sushi go round", min: 80000, max: 150000 },
  { desc: "Ayam geprek mentai", min: 28000, max: 45000 },
  { desc: "Martabak malam", min: 35000, max: 75000 },
  { desc: "Seblak level 2", min: 15000, max: 30000 },
  { desc: "Dinner bareng teman", min: 75000, max: 180000 },
]
const FOOD_WALLETS = ["GoPay", "Dompet Tunai", "ShopeePay", "BCA"]
const TRANSPORT = [
  { desc: "Gojek ke kantor", min: 15000, max: 30000 },
  { desc: "MRT + ojek", min: 20000, max: 35000 },
  { desc: "Bensin motor", min: 20000, max: 50000 },
  { desc: "Parkir & tol", min: 10000, max: 30000 },
  { desc: "Grab ke tempat klien", min: 25000, max: 60000 },
]
const SHOPPING = [
  { desc: "Skincare", min: 80000, max: 350000 },
  { desc: "Kaos & celana", min: 100000, max: 400000 },
  { desc: "Sepatu baru", min: 250000, max: 900000 },
  { desc: "Aksesoris HP", min: 50000, max: 250000 },
  { desc: "Pakaian thrift", min: 60000, max: 200000 },
]
const FUN = [
  { desc: "Nonton bioskop", min: 50000, max: 120000 },
  { desc: "Streaming & game", min: 30000, max: 100000 },
  { desc: "Main biliar", min: 60000, max: 150000 },
  { desc: "Konser / event", min: 150000, max: 500000 },
]
const HOME = [
  { desc: "Belanja bulanan (sembako)", min: 350000, max: 700000 },
  { desc: "Gas & air galon", min: 40000, max: 100000 },
  { desc: "Laundry bulanan", min: 80000, max: 150000 },
]

export async function isSeeded(userId: string): Promise<boolean> {
  const count = await db.wallet.count({ where: { userId } })
  return count > 0
}

// Saldo akhir yang diinginkan untuk tiap dompet (realistis, tidak negatif)
const TARGET_BALANCE: Record<string, number> = {
  BCA: 24_000_000,
  GoPay: 850_000,
  "Dompet Tunai": 650_000,
  ShopeePay: 500_000,
}

export async function resetDemoData(userId: string) {
  await db.transaction.deleteMany({ where: { userId } })
  await db.budget.deleteMany({ where: { userId } })
  await db.savingsGoal.deleteMany({ where: { userId } })
  await db.debt.deleteMany({ where: { userId } })
  await db.category.deleteMany({ where: { userId } })
  await db.wallet.deleteMany({ where: { userId } })
  await seedDemoData(userId)
}

export async function seedDemoData(userId: string) {
  // ---------- Wallets (saldo awal dihitung setelah transaksi dibuat) ----------
  const wallets: Record<string, string> = {}
  for (const w of WALLETS) {
    const created = await db.wallet.create({ data: { ...w, initialBalance: 0, userId } })
    wallets[w.name] = created.id
  }

  // ---------- Categories ----------
  const cats: Record<string, { id: string; type: string }> = {}
  for (const c of INCOME_CATEGORIES) {
    const created = await db.category.create({ data: { ...c, type: "income", userId } })
    cats[c.name] = { id: created.id, type: "income" }
  }
  for (const c of EXPENSE_CATEGORIES) {
    const created = await db.category.create({ data: { ...c, type: "expense", userId } })
    cats[c.name] = { id: created.id, type: "expense" }
  }

  const now = new Date()
  const y = now.getFullYear()
  const thisMonth = now.getMonth() // 0-based, Nov = 10

  type Tx = {
    type: "income" | "expense"
    amount: number
    description: string
    date: Date
    walletId: string
    categoryId: string
    userId: string
  }
  const txs: Tx[] = []

  const addTx = (
    type: "income" | "expense",
    categoryName: string,
    walletName: string,
    amount: number,
    description: string,
    date: Date
  ) => {
    txs.push({
      type,
      amount,
      description,
      date,
      walletId: wallets[walletName],
      categoryId: cats[categoryName].id,
      userId,
    })
  }

  // ---------- Generate 6 months of transactions (5 full months + current) ----------
  const monthsBack = 5
  for (let m = monthsBack; m >= 0; m--) {
    const monthDate = new Date(y, thisMonth - m, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lastDay = m === 0 ? now.getDate() : daysInMonth

    // Salary on the 28th (or last available day of current month)
    if (lastDay >= 28) {
      addTx("income", "Gaji", "BCA", 8500000, "Gaji bulanan PT Cipta Digital", new Date(year, month, 28))
    }
    // Bonus twice
    if (m === monthsBack - 1) {
      addTx("income", "Bonus", "BCA", 2000000, "Bonus kinerja Q2", new Date(year, month, 5))
    }
    if (m === 1) {
      addTx("income", "Bonus", "BCA", 2500000, "Bonus proyek selesai", new Date(year, month, 9))
    }
    // Freelance income occasionally
    if (m >= 1 && lastDay >= 18) {
      addTx("income", "Freelance", "BCA", roundTo(randInt(1500, 3200), 50) * 1000, "Proyek desain landing page", new Date(year, month, 18))
    }
    if (m === monthsBack && lastDay >= 21) {
      addTx("income", "Freelance", "BCA", 1750000, "Jasa setup toko online", new Date(year, month, 21))
    }
    // Small investment return
    if (lastDay >= 25 && m > 0) {
      addTx("income", "Investasi", "BCA", roundTo(randInt(80, 250), 10) * 1000, "Dividen reksadana", new Date(year, month, 25))
    }

    // Daily food expenses (skip some days randomly)
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d)
      const dow = date.getDay()

      // 1-2 food transactions per day
      const nFood = rand() < 0.75 ? 1 : 2
      for (let i = 0; i < nFood; i++) {
        const f = pick(FOOD)
        addTx("expense", "Makan & Minum", pick(FOOD_WALLETS), roundTo(randInt(f.min, f.max), 500), f.desc, date)
      }
      // Weekend hangout
      if ((dow === 6 || dow === 0) && rand() < 0.5 && lastDay >= d) {
        const f = pick(FOOD.slice(10))
        addTx("expense", "Makan & Minum", pick(["BCA", "GoPay"]), roundTo(randInt(f.min, f.max), 500), f.desc, date)
      }
      // Transport ~4x per week
      if (rand() < 0.55) {
        const t = pick(TRANSPORT)
        addTx("expense", "Transportasi", rand() < 0.5 ? "GoPay" : "Dompet Tunai", roundTo(randInt(t.min, t.max), 500), t.desc, date)
      }
    }

    // Weekly groceries on Saturdays
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d)
      if (date.getDay() === 6 && rand() < 0.7) {
        const h = pick(HOME)
        addTx("expense", "Rumah Tangga", "BCA", roundTo(randInt(h.min, h.max), 1000), h.desc, date)
      }
    }

    // Monthly bills
    if (lastDay >= 5) addTx("expense", "Tagihan", "BCA", 350000, "Token listrik", new Date(year, month, 5))
    if (lastDay >= 8) addTx("expense", "Tagihan", "BCA", 320000, "Internet IndiHome", new Date(year, month, 8))
    if (lastDay >= 12) addTx("expense", "Hiburan", "BCA", 54000, "Langganan Netflix", new Date(year, month, 12))
    if (lastDay >= 15) addTx("expense", "Tagihan", "BCA", 450000, "Cicilan HP", new Date(year, month, 15))
    if (lastDay >= 20) addTx("expense", "Tagihan", "GoPay", 75000, "Paket data XL", new Date(year, month, 20))

    // Shopping 1-2x per month
    const nShop = randInt(1, 2)
    for (let i = 0; i < nShop; i++) {
      const s = pick(SHOPPING)
      const d = randInt(3, Math.max(3, lastDay))
      addTx("expense", "Belanja", rand() < 0.6 ? "ShopeePay" : "BCA", roundTo(randInt(s.min, s.max), 1000), s.desc, new Date(year, month, d))
    }
    // Entertainment
    if (lastDay >= 6) {
      const f = pick(FUN)
      addTx("expense", "Hiburan", "BCA", roundTo(randInt(f.min, f.max), 1000), f.desc, new Date(year, month, randInt(3, lastDay)))
    }
    // Health occasionally
    if (rand() < 0.4 && lastDay >= 10) {
      addTx("expense", "Kesehatan", "BCA", roundTo(randInt(60000, 500000), 5000), pick(["Vitamin & suplemen", "Obat flu & demam", "Kontrol dokter gigi", "Cek lab darah"]), new Date(year, month, randInt(2, lastDay)))
    }
    // Education occasionally
    if (rand() < 0.3 && lastDay >= 14) {
      addTx("expense", "Pendidikan", "BCA", roundTo(randInt(100000, 450000), 5000), pick(["Kursus online UI/UX", "Buku & e-book", "Langganan belajar bahasa"]), new Date(year, month, randInt(2, lastDay)))
    }
    // Donation
    if (lastDay >= 27) {
      addTx("expense", "Donasi", "BCA", roundTo(randInt(50, 200), 10) * 1000, "Sedekah & zakat", new Date(year, month, 27))
    }
  }

  // Batch create transactions
  await db.transaction.createMany({ data: txs })

  // ---------- Set saldo awal agar saldo akhir tiap dompet realistis ----------
  const allTxs = await db.transaction.findMany({
    where: { userId },
    select: { walletId: true, type: true, amount: true },
  })
  for (const [name, id] of Object.entries(wallets)) {
    const net = allTxs
      .filter((t) => t.walletId === id)
      .reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0)
    const target = TARGET_BALANCE[name] ?? 500_000
    // Saldo awal minimal 0; jika net pengeluaran sangat besar, saldo awal ikut menaikkan saldo akhir ke target
    const initial = Math.max(0, Math.round((target - net) / 1000) * 1000)
    await db.wallet.update({ where: { id }, data: { initialBalance: initial } })
  }

  // ---------- Budgets for current month ----------
  const monthKey = `${y}-${String(thisMonth + 1).padStart(2, "0")}`
  const budgetPlan: Record<string, number> = {
    "Makan & Minum": 2500000,
    Transportasi: 800000,
    Belanja: 700000,
    Tagihan: 1200000,
    Hiburan: 500000,
    Kesehatan: 400000,
    "Rumah Tangga": 1500000,
    Pendidikan: 300000,
    Donasi: 200000,
  }
  for (const [name, amount] of Object.entries(budgetPlan)) {
    await db.budget.create({
      data: { month: monthKey, amount, categoryId: cats[name].id, userId },
    })
  }
  // Budget for previous month too (for comparison)
  const prevMonthDate = new Date(y, thisMonth - 1, 1)
  const prevKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`
  for (const [name, amount] of Object.entries(budgetPlan)) {
    await db.budget.create({
      data: { month: prevKey, amount: Math.round(amount * 0.9), categoryId: cats[name].id, userId },
    })
  }

  // ---------- Savings goals ----------
  await db.savingsGoal.createMany({
    data: [
      { userId, name: "Dana Darurat", targetAmount: 30000000, currentAmount: 14500000, deadline: new Date(y + 1, 5, 30), icon: "shield", color: "#10b981" },
      { userId, name: "Beli Laptop Baru", targetAmount: 18000000, currentAmount: 6200000, deadline: new Date(y + 1, 2, 31), icon: "laptop", color: "#14b8a6" },
      { userId, name: "Liburan ke Bali", targetAmount: 8000000, currentAmount: 5100000, deadline: new Date(y + 1, 0, 15), icon: "plane", color: "#f59e0b" },
    ],
  })

  // ---------- Debts & receivables ----------
  await db.debt.createMany({
    data: [
      { userId, type: "debt", person: "Rudi", amount: 750000, paidAmount: 250000, note: "Kavling konser kemarin", dueDate: new Date(y, thisMonth, 20), settled: false },
      { userId, type: "debt", person: "Kartu Kredit BCA", amount: 1200000, paidAmount: 0, note: "Tagihan belanja online", dueDate: new Date(y, thisMonth, 25), settled: false },
      { userId, type: "receivable", person: "Sinta", amount: 500000, paidAmount: 500000, note: "Pinjaman renovasi", dueDate: new Date(y, thisMonth - 1, 10), settled: true },
      { userId, type: "receivable", person: "Bimo", amount: 350000, paidAmount: 0, note: "Bayar makan bareng", dueDate: new Date(y, thisMonth, 15), settled: false },
    ],
  })

  return { transactions: txs.length }
}
