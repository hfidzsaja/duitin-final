"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getDeviceId } from "@/lib/device"
import type { ChatMessage } from "./types"
import { SendHorizonal, Sparkles, Bot, User, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

// Render balasan AI (mendukung markdown ringan: tebal, daftar)
function AssistantContent({ content }: { content: string }) {
  return (
    <div className="duitin-md">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-1.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

const SUGGESTIONS = [
  "Analisis pengeluaranku bulan ini dong",
  "Berapa total saldo dan sisa anggaranku?",
  "Apa yang harus aku kurangi biar lebih irit?",
  "Bantu aku bikin strategi nabung dana darurat",
]

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hai! Aku Cuan, asisten keuanganmu 🤖💚\n\nAku sudah baca seluruh catatan keuanganmu — dompet, anggaran, tabungan, sampai hutang. Tanya apa saja tentang uangmu, nanti kuanalisis langsung dari data aslimu.",
}

export function PageAssistant() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content }
    const history = messages.filter((m) => m.id !== "welcome").slice(-8)
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getDeviceId() },
        body: JSON.stringify({ message: content, history }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Asisten tidak merespons")
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: json.reply },
      ])
    } catch (e) {
      toast({
        title: "Asisten sedang sibuk",
        description: e instanceof Error ? e.message : "Coba lagi sebentar ya",
        variant: "destructive",
      })
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Maaf, aku lagi sibuk 😅 Coba tanya ulang sebentar lagi ya.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-13.5rem)] lg:h-[calc(100dvh-8rem)] min-h-[420px]">
      {/* Header asisten */}
      <Card className="glass-card border-border/50 rounded-2xl p-4 flex items-center gap-3 mb-3 shrink-0">
        <div className="relative">
          <span className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-card" aria-hidden />
        </div>
        <div>
          <p className="font-bold text-sm">Cuan — Asisten Keuangan AI</p>
          <p className="text-[11px] text-muted-foreground">Membaca data real-mu · online</p>
        </div>
      </Card>

      {/* Area chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-2.5 max-w-[92%]", m.role === "user" ? "ml-auto flex-row-reverse" : "")}>
            <span
              className={cn(
                "h-8 w-8 shrink-0 rounded-full flex items-center justify-center mt-0.5",
                m.role === "user" ? "bg-secondary" : "bg-primary/15"
              )}
              aria-hidden
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
            </span>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words max-w-full",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-md whitespace-pre-wrap"
                  : "glass-card border-border/50 rounded-tl-md"
              )}
            >
              {m.role === "user" ? m.content : <AssistantContent content={m.content} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 max-w-[92%]">
            <span className="h-8 w-8 shrink-0 rounded-full bg-primary/15 flex items-center justify-center" aria-hidden>
              <Bot className="h-4 w-4 text-primary" />
            </span>
            <div className="glass-card border-border/50 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Cuan sedang menganalisis datamu…
            </div>
          </div>
        )}
      </div>

      {/* Saran cepat */}
      {messages.length <= 2 && !loading && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="shrink-0 glass-card rounded-full px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0" /> {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-2 safe-bottom shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Tanya apa saja soal keuanganmu…"
          className="h-12 rounded-2xl bg-background/70"
          aria-label="Pertanyaan untuk asisten"
        />
        <Button
          size="icon"
          className="h-12 w-12 rounded-2xl shrink-0"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          aria-label="Kirim pesan"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
