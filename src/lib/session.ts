import { db } from "@/lib/db"

// Identitas pengguna per perangkat — tanpa login.
// Klien mengirim deviceId acak (tersimpan di localStorage) pada header "x-user-id".
// Server mencari profil terkait; jika perangkat baru, profil otomatis dibuat
// dan data demo akan di-seed khusus untuknya (via /api/seed).

const FALLBACK_DEVICE = "guest-default"

export async function resolveUserId(req: Request): Promise<string> {
  const deviceId =
    (req.headers.get("x-user-id") || "").trim().slice(0, 80) || FALLBACK_DEVICE

  const existing = await db.user.findUnique({ where: { deviceId } })
  if (existing) return existing.id

  try {
    const created = await db.user.create({ data: { deviceId } })
    return created.id
  } catch {
    // Balapan dengan request paralel lain: profil sudah dibuat oleh request lain
    const again = await db.user.findUnique({ where: { deviceId } })
    if (again) return again.id
    throw new Error("Gagal menyiapkan profil pengguna")
  }
}

export async function getUserName(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } })
  return user?.name ?? ""
}
