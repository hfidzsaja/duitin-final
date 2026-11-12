// Tipe data bersama frontend Duitin

export interface Wallet {
  id: string
  name: string
  type: "cash" | "bank" | "ewallet"
  icon: string
  color: string
  initialBalance: number
  isDefault: boolean
  balance: number
}

export interface Category {
  id: string
  name: string
  type: "income" | "expense"
  icon: string
  color: string
}

export interface TxWalletInfo {
  id: string
  name: string
  icon: string
  color: string
}
export interface TxCategoryInfo {
  id: string
  name: string
  icon: string
  color: string
}

export interface Transaction {
  id: string
  type: "income" | "expense"
  amount: number
  description: string
  date: string
  walletId: string
  categoryId: string
  wallet: TxWalletInfo
  category: TxCategoryInfo
}

export interface Budget {
  id: string
  month: string
  amount: number
  categoryId: string
  category: TxCategoryInfo
  spent: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  icon: string
  color: string
}

export interface Debt {
  id: string
  type: "debt" | "receivable"
  person: string
  amount: number
  paidAmount: number
  note: string
  dueDate: string | null
  settled: boolean
}

export interface TrendPoint {
  month: string
  label: string
  income: number
  expense: number
}

export interface Insight {
  id: string
  type: "info" | "warning" | "success" | "tip"
  title: string
  body: string
}

export interface Stats {
  totalBalance: number
  walletBalances: Pick<Wallet, "id" | "name" | "type" | "icon" | "color" | "isDefault" | "balance">[]
  monthSummary: { income: number; expense: number; net: number }
  categoryBreakdown: { id: string; name: string; icon: string; color: string; total: number }[]
  trend: TrendPoint[]
  budgetStatus: {
    id: string
    categoryName: string
    categoryIcon: string
    categoryColor: string
    amount: number
    spent: number
    pct: number
    over: boolean
  }[]
  healthScore: number
  healthComponents: { key: string; label: string; score: number; max: number; detail: string }[]
  insights: Insight[]
  dailyBurn: number
  projected: number
  streak: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}
