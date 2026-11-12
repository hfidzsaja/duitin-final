import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'
import { mkdirSync } from 'fs'
import path from 'path'
import { SCHEMA_SQL } from '@/lib/ddl'

// ============================================================
// Lapisan tahan-banting — perilaku sama di lokal, Vercel, Netlify:
// 1. DATABASE_URL kosong/"undefined" → otomatis SQLite lokal.
// 2. Adapter v7 diberi OBJEK KONFIG {url, authToken} (bukan
//    instance client) — ini akar perbaikan URL_INVALID.
// 3. URL file: → folder dibuat otomatis (no SQLITE_CANTOPEN 14).
// 4. Tabel dibuat otomatis sekali per proses (IF NOT EXISTS) —
//    tidak ada lagi "no such table"/P2021, termasuk Turso baru.
// ============================================================

const FALLBACK_URL = 'file:./db/custom.db'

function resolveDbUrl(): string {
  const raw = (process.env.DATABASE_URL ?? '').trim()
  if (!raw || raw === 'undefined' || raw === 'null') return FALLBACK_URL
  return raw
}

const dbUrl = resolveDbUrl()

// Prisma membaca env("DATABASE_URL") saat runtime — pastikan selalu valid.
process.env.DATABASE_URL = dbUrl

function buildConfig(): { url: string; authToken?: string } {
  const token = (process.env.DATABASE_AUTH_TOKEN ?? '').trim() || undefined
  if (dbUrl.startsWith('file:')) {
    const rel = dbUrl.slice('file:'.length).split('?')[0]
    const abs = path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel)
    try {
      mkdirSync(path.dirname(abs), { recursive: true })
    } catch {
      /* filesystem read-only (serverless) — biarkan client yang protes */
    }
  }
  return { url: dbUrl, authToken: token }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  duitinSchemaReady?: Promise<void>
}

function ensureSchema(client: Client): Promise<void> {
  if (!globalForPrisma.duitinSchemaReady) {
    const run = (async () => {
      const statements = SCHEMA_SQL.split(';')
        .map((s) => s.replace(/^\s*--[^\n]*/gm, '').trim())
        .filter(Boolean)
      for (const sql of statements) {
        await client.execute(sql)
      }
    })()
    globalForPrisma.duitinSchemaReady = run.catch((err) => {
      // Gagal sekarang → dicoba ulang otomatis di request berikutnya
      globalForPrisma.duitinSchemaReady = undefined
      throw err
    })
  }
  return globalForPrisma.duitinSchemaReady
}

const config = buildConfig()

// Adapter v7: PABRIK KONFIGURASI — dia yang membuat client-nya sendiri.
const real = new PrismaClient({ adapter: new PrismaLibSql(config) })

// Client terpisah khusus pembuatan tabel (sekali per proses).
const schemaClient = createClient(config)
ensureSchema(schemaClient).catch(() => {})

/**
 * Proxy dua lapis: setiap `db.<model>.<method>(...)` otomatis
 * menunggu ensureSchema selesai, lalu diteruskan ke Prisma.
 * Kode di seluruh aplikasi tidak perlu berubah.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, model: string) {
    return new Proxy({}, {
      get(_t2, method: string) {
        return (...args: unknown[]) =>
          ensureSchema(schemaClient).then(() =>
            (real as unknown as Record<string, (...a: unknown[]) => unknown>)[model][method](...args)
          )
      },
    })
  },
}) as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
