"use client"

// Identitas perangkat untuk isolasi data antar pengguna (tanpa login).
// ID acak dibuat sekali dan disimpan permanen di localStorage.

const KEY = "duitin_device_id"

export function getDeviceId(): string {
  if (typeof window === "undefined") return ""
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(KEY, id)
  }
  return id
}

// 8 karakter pertama untuk ditampilkan di UI (bukan rahasia, hanya penanda)
export function shortDeviceId(): string {
  const id = getDeviceId()
  return id ? id.slice(0, 8).toUpperCase() : ""
}
