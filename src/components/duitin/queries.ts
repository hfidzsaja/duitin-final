"use client"

// Data-fetching hooks berbasis TanStack Query untuk semua resource Duitin
// Setiap request membawa identitas perangkat (header x-user-id) agar data
// tiap pengguna terpisah otomatis — tanpa login.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getDeviceId } from "@/lib/device"
import type { Wallet, Category, Transaction, Budget, Goal, Debt, Stats } from "./types"

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": getDeviceId(),
      ...(init?.headers ?? {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || "Terjadi kesalahan")
  return json as T
}

export function useSeedCheck() {
  return useQuery({
    queryKey: ["seed"],
    queryFn: () => api<{ seeded: boolean; name: string }>("/api/seed"),
    staleTime: 0,
  })
}

export function useRunSeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (force: boolean) =>
      api<{ ok: boolean }>("/api/seed", { method: "POST", body: JSON.stringify({ force }) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => api<{ name: string }>("/api/session"),
  })
}

export function useUpdateName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api<{ ok: boolean; name: string }>("/api/session", { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/api/stats"),
    refetchInterval: 60_000,
  })
}

export function useWallets() {
  return useQuery({ queryKey: ["wallets"], queryFn: () => api<Wallet[]>("/api/wallets") })
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api<Category[]>("/api/categories") })
}

export interface TxFilter {
  month?: string
  type?: "income" | "expense" | "all"
  walletId?: string
  categoryId?: string
  search?: string
  days?: number
  limit?: number
}

function txQueryUrl(f: TxFilter): string {
  const p = new URLSearchParams()
  if (f.month) p.set("month", f.month)
  if (f.type && f.type !== "all") p.set("type", f.type)
  if (f.walletId) p.set("walletId", f.walletId)
  if (f.categoryId) p.set("categoryId", f.categoryId)
  if (f.search) p.set("search", f.search)
  if (f.days) p.set("days", String(f.days))
  if (f.limit) p.set("limit", String(f.limit))
  const q = p.toString()
  return `/api/transactions${q ? `?${q}` : ""}`
}

export function useTransactions(filter: TxFilter) {
  return useQuery({
    queryKey: ["transactions", filter],
    queryFn: () => api<Transaction[]>(txQueryUrl(filter)),
  })
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => api<Budget[]>(`/api/budgets?month=${month}`),
  })
}

export function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/api/goals") })
}

export function useDebts() {
  return useQuery({ queryKey: ["debts"], queryFn: () => api<Debt[]>("/api/debts") })
}

// ---------- Mutations ----------

export const txKeysToInvalidate = ["stats", "wallets", "transactions", "budgets", "debts", "goals"]

export function useSaveTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id?: string
      type: string
      amount: number
      description: string
      date: string
      walletId: string
      categoryId: string
    }) =>
      id
        ? api<Transaction>(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : api<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useCreateWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; type: string; icon?: string; color?: string; initialBalance: number }) =>
      api<Wallet>("/api/wallets", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdateWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; type?: string; initialBalance?: number }) =>
      api<Wallet>(`/api/wallets/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/wallets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; type: string; icon?: string; color?: string }) =>
      api<Category>("/api/categories", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useSaveBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { categoryId: string; month: string; amount: number }) =>
      api<Budget>("/api/budgets", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; targetAmount: number; currentAmount?: number; deadline?: string | null; icon?: string; color?: string }) =>
      api<Goal>("/api/goals", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDepositGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, deposit }: { id: string; deposit: number }) =>
      api<Goal>(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify({ deposit }) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { type: string; person: string; amount: number; note?: string; dueDate?: string | null }) =>
      api<Debt>("/api/debts", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function usePayDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pay }: { id: string; pay: number }) =>
      api<Debt>(`/api/debts/${id}`, { method: "PATCH", body: JSON.stringify({ pay }) }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/debts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export async function aiParse(text: string) {
  return api<{
    type: "income" | "expense"
    amount: number
    description: string
    categoryName: string
    walletName: string
    categoryId: string | null
    walletId: string | null
  }>("/api/ai/parse", { method: "POST", body: JSON.stringify({ text }) })
}
