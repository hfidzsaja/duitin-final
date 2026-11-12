"use client"

import { useEffect, useState } from "react"

// Registrasi Service Worker untuk mendukung PWA (installable + offline shell)
export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      // Tampilkan hint install hanya jika belum pernah ditutup
      if (!localStorage.getItem("duitin-install-dismissed")) setShowHint(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (!showHint || !installPrompt) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md glass-card rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center text-lg">📲</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Pasang Duitin di HP</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Buka seperti aplikasi biasa, lebih cepat, dan tetap terlihat meski sinyal hilang.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
              onClick={async () => {
                const evt = installPrompt as Event & { prompt?: () => Promise<void> }
                await evt.prompt?.()
                setShowHint(false)
              }}
            >
              Pasang Sekarang
            </button>
            <button
              className="h-9 px-4 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition"
              onClick={() => {
                localStorage.setItem("duitin-install-dismissed", "1")
                setShowHint(false)
              }}
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
