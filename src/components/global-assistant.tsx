"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, AudioLines, Check, ChevronDown, Copy, ExternalLink, Languages, Leaf, MessageCircle, Mic, MicOff, RotateCcw, ShieldCheck, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { CHAT_LANGUAGES, type ChatLanguage } from "@/lib/chat-languages";

type ChatItem = {
  id: number;
  role: "assistant" | "user";
  content: string;
  language?: string;
  source?: string | null;
  model?: string | null;
  createdAt?: string;
  links?: { href: string; label: string }[];
};

type SpeechRecognitionLike = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const quickPrompts = [
  { en: "How do I sell my devices?", hi: "मैं अपना फोन कैसे बेचूँ?", pa: "ਮੈਂ ਆਪਣਾ ਫ਼ੋਨ ਕਿਵੇਂ ਵੇਚਾਂ?", icon: "✦" },
  { en: "Where are Punjab collection points?", hi: "पंजाब में केंद्र कहाँ हैं?", pa: "ਪੰਜਾਬ ਦੇ ਕੇਂਦਰ ਕਿੱਥੇ ਹਨ?", icon: "⌖" },
  { en: "When will I get paid?", hi: "मुझे भुगतान कब मिलेगा?", pa: "ਮੈਨੂੰ ਪੈਸੇ ਕਦੋਂ ਮਿਲਣਗੇ?", icon: "₹" },
  { en: "Track my pickup", hi: "मेरा पिकअप ट्रैक करें", pa: "ਮੇਰਾ ਪਿਕਅੱਪ ਟਰੈਕ ਕਰੋ", icon: "↗" },
];

const intro: Record<string, string> = {
  en: "Hey there! I'm Tara. Ask me about listing your devices, finding a Punjab collection point, booking pickup, tracking recycling or your sample wallet. 👋",
  hi: "नमस्ते! मैं तारा हूँ। उत्पाद लिस्टिंग, पंजाब डेमो केंद्र, पिकअप, ट्रैकिंग या डेमो वॉलेट के बारे में पूछें। 👋",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤਾਰਾ ਹਾਂ। ਡਿਵਾਈਸ ਲਿਸਟਿੰਗ, ਪੰਜਾਬ ਦੇ ਡੈਮੋ ਹੱਬ, ਪਿਕਅੱਪ ਜਾਂ ਡੈਮੋ ਵਾਲਿਟ ਬਾਰੇ ਪੁੱਛੋ। 👋",
};

export function GlobalAssistant() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<ChatLanguage>("auto");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch("/api/chat", { cache: "no-store" });
        const body = response.ok ? await response.json() : null;
        setProviderConfigured(Boolean(body?.providerConfigured));
        if (user) {
          if (body) setMessages((body.messages || []).map((item: ChatItem) => ({ ...item })));
        } else {
          const stored = window.localStorage.getItem("ecotrace_tara_guest_chat");
          setMessages(stored ? (JSON.parse(stored) as ChatItem[]).slice(-24) : []);
        }
      } catch { setMessages([]); setProviderConfigured(false); }
      finally { setHistoryLoading(false); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user?.id, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open]);

  useEffect(() => {
    const closeOnEsc = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(false); };
    const openAssistant = () => setOpen(true);
    window.addEventListener("keydown", closeOnEsc);
    window.addEventListener("ecotrace:open-assistant", openAssistant);
    return () => { window.removeEventListener("keydown", closeOnEsc); window.removeEventListener("ecotrace:open-assistant", openAssistant); };
  }, []);

  const send = async (value?: string) => {
    const message = (value ?? draft).trim();
    if (!message || loading) return;
    setDraft("");
    const userItem: ChatItem = { id: new Date().getTime(), role: "user", content: message, createdAt: new Date().toISOString() };
    const prev = messages;
    setMessages((all) => [...all, userItem]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language, history: prev.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 700) })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant temporarily unavailable.");
      const answer: ChatItem = { id: new Date().getTime() + 1, role: "assistant", content: data.reply,
        language: data.language, source: data.mode, model: data.model ?? null, links: data.links ?? [], createdAt: new Date().toISOString() };
      setMessages((all) => {
        const next = [...all, answer].slice(-40);
        if (!user) window.localStorage.setItem("ecotrace_tara_guest_chat", JSON.stringify(next.slice(-20)));
        return next;
      });
    } catch (e) {
      const answer: ChatItem = { id: new Date().getTime() + 1, role: "assistant", content: e instanceof Error ? e.message : "Please try again.", source: "error" };
      setMessages((all) => [...all, answer]);
    } finally { setLoading(false); }
  };

  const clearChat = async () => {
    try { await fetch("/api/chat", { method: "DELETE" }); } catch { /* local history still clears */ }
    window.localStorage.removeItem("ecotrace_tara_guest_chat");
    setMessages([]);
    window.speechSynthesis?.cancel();
    setSpeaking(null);
  };

  const startVoice = () => {
    if (listening) { voiceRef.current?.stop(); setListening(false); return; }
    const speechWindow = window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SpeechCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechCtor) { setDraft("Voice input isn't available in this browser. You can type in your language instead."); return; }
    const rec = new SpeechCtor();
    rec.lang = CHAT_LANGUAGES.find((lang) => lang.id === language)?.speech ?? "en-IN";
    rec.onresult = (event) => { setDraft(event.results[0]?.[0]?.transcript || ""); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    voiceRef.current = rec;
    setListening(true);
    rec.start();
  };

  const readAloud = (item: ChatItem) => {
    if (!("speechSynthesis" in window)) return;
    if (speaking === item.id) { window.speechSynthesis.cancel(); setSpeaking(null); return; }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(item.content.replaceAll("*", ""));
    speech.lang = CHAT_LANGUAGES.find((lang) => lang.id === (item.language || language))?.speech ?? "en-IN";
    speech.rate = 0.92;
    speech.onend = () => setSpeaking(null);
    setSpeaking(item.id);
    window.speechSynthesis.speak(speech);
  };

  const copyText = async (item: ChatItem) => {
    try { await navigator.clipboard.writeText(item.content); setCopiedId(item.id); window.setTimeout(() => setCopiedId(null), 1800); } catch { /* clipboard unavailable */ }
  };

  const pLang = language === "hi" ? "hi" : language === "pa" ? "pa" : "en";
  const welcomeText = intro[pLang];

  return <>
    {/* Persistent luminous launcher */}
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2 print:hidden">
      {!open && <div className="hidden sm:flex max-w-[190px] items-center gap-2 rounded-2xl border border-emerald-200/70 dark:border-emerald-600/30 bg-white/90 dark:bg-[#102b22]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl animate-float-delayed">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
        <span className="text-xs font-bold text-slate-800 dark:text-white">Need a hand? Ask Tara.</span>
      </div>}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close assistant" : "Open multilingual assistant"} className="group relative flex h-15 w-15 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#064e3b] via-[#059669] to-[#77d5a3] text-white shadow-[0_18px_42px_rgba(5,100,69,.35)] ring-4 ring-white/80 dark:ring-emerald-800/30 transition-all duration-300 hover:-translate-y-1 hover:rotate-3 hover:shadow-[0_22px_55px_rgba(5,100,69,.48)]">
        <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        {open ? <X className="h-6 w-6 relative" /> : <MessageCircle className="h-7 w-7 relative" />}
      </button>
    </div>

    {open && <div className="fixed inset-x-3 bottom-23 sm:inset-x-auto sm:right-5 sm:bottom-24 z-[80] flex h-[min(690px,calc(100dvh-112px))] sm:w-[420px] flex-col overflow-hidden rounded-[28px] border border-emerald-200/80 dark:border-emerald-500/20 bg-white/95 dark:bg-[#0b2119]/97 shadow-[0_30px_90px_rgba(4,47,36,.26)] backdrop-blur-2xl animate-assistant-in print:hidden" role="dialog" aria-label="Tara multilingual assistant">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#053b2b] via-[#07694a] to-[#0a8b5f] px-5 pt-5 pb-4 text-white shrink-0">
        <div className="pointer-events-none absolute -top-16 -right-10 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 shadow-lg"><Leaf className="h-6 w-6 text-lime-200" /><span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-[3px] border-[#066045] bg-lime-300" /></div><div><p className="text-[10px] tracking-[.18em] uppercase text-emerald-200 font-bold">{providerConfigured ? "OpenRouter AI configured" : "Your circular companion"}</p><h2 className="text-xl font-extrabold tracking-tight">Tara <span className="text-xs font-medium text-emerald-200">by EcoTrace</span></h2><p className="text-[11px] text-emerald-100">Here to make the journey simpler</p></div></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-xl bg-white/10 hover:bg-white/20 p-2 transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="relative mt-4 flex items-center gap-2">
          <div className="relative flex-1"><Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-200 pointer-events-none" /><select aria-label="Chat language" value={language} onChange={(e) => setLanguage(e.target.value as ChatLanguage)} className="w-full appearance-none rounded-xl border border-white/20 bg-white/10 pl-9 pr-7 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-200">{CHAT_LANGUAGES.map((l) => <option key={l.id} value={l.id} className="text-slate-900">{l.native}</option>)}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-200 pointer-events-none" /></div>
          <span className="flex items-center gap-1 rounded-xl bg-white/10 border border-white/15 px-2.5 py-2 text-[10px] whitespace-nowrap font-bold"><ShieldCheck className="w-3 h-3 text-lime-200" /> {user ? "Private history" : "Guest chat"}</span>
          <button type="button" title="Clear conversation" onClick={clearChat} className="p-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[radial-gradient(circle_at_85%_4%,rgba(16,185,129,.08),transparent_42%)]">
        <div className="flex gap-2.5 items-start animate-fade-up"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200"><Sparkles className="h-4 w-4" /></div><div className="rounded-[18px] rounded-tl-md bg-[#f0f7f2] dark:bg-[#113329] border border-emerald-200/60 dark:border-emerald-800/50 p-3.5 text-[13px] leading-relaxed text-slate-800 dark:text-emerald-50">{welcomeText}</div></div>
        {messages.length === 0 && !historyLoading && <div className="pl-10 space-y-2 animate-fade-up"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">Start with a question</p><div className="grid grid-cols-2 gap-2">{quickPrompts.map((p) => <button type="button" key={p.en} onClick={() => send(p[pLang])} className="group rounded-xl border border-emerald-100 dark:border-emerald-800 bg-white dark:bg-[#102a21] p-2.5 text-left text-[11px] font-semibold text-slate-700 dark:text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"><span className="block mb-1 text-emerald-600 text-base">{p.icon}</span>{p[pLang]}</button>)}</div></div>}
        {historyLoading && <p className="pl-10 text-xs text-slate-400 animate-pulse">Loading your conversation...</p>}
        {messages.map((m) => <div key={m.id} className={`flex gap-2 items-end animate-fade-up ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          {m.role === "assistant" && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 mb-5"><Leaf className="h-3.5 w-3.5" /></div>}
          <div className={`max-w-[85%] min-w-0 ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}><div className={`rounded-[18px] px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-line ${m.role === "user" ? "bg-gradient-to-br from-emerald-700 to-emerald-600 text-white rounded-br-md shadow-md" : "bg-[#f0f7f2] dark:bg-[#113329] text-slate-800 dark:text-emerald-50 rounded-bl-md border border-emerald-200/60 dark:border-emerald-800/50"}`}>{m.content.replaceAll("*", "")}</div>
            {m.role === "assistant" && <><div className="flex flex-wrap gap-1.5">{m.links?.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#173b2d] border border-emerald-200 dark:border-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50"><ExternalLink className="h-3 w-3" />{link.label}</Link>)}</div><div className="flex items-center gap-2 px-1"><span className="text-[9px] font-semibold text-slate-400">{m.source === "live_ai" ? `Live OpenRouter AI${m.model ? ` · ${m.model.split("/").pop()}` : ""} · verify details` : m.source === "error" ? "Connection issue" : "Private/local guided answer"}</span><button type="button" onClick={() => copyText(m)} title="Copy reply" className="text-slate-400 hover:text-emerald-600">{copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button><button type="button" onClick={() => readAloud(m)} title={speaking === m.id ? "Stop reading" : "Read reply aloud"} className="text-slate-400 hover:text-emerald-600">{speaking === m.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}</button></div></>}
          </div>
        </div>)}
        {loading && <div className="flex gap-2.5 items-center pl-1"><div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-900/70"><Sparkles className="h-3.5 w-3.5 text-emerald-700" /></div><div className="rounded-2xl bg-[#f0f7f2] dark:bg-[#113329] px-4 py-3 flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-emerald-900/10 dark:border-emerald-600/15 bg-white/90 dark:bg-[#0b2119] px-4 pt-3 pb-4 space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#f7fbf8] dark:bg-[#102a21] p-1.5 pl-3 shadow-inner focus-within:ring-2 focus-within:ring-emerald-400/35">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={1} maxLength={700} placeholder={pLang === "hi" ? "कोई भी सवाल पूछें..." : pLang === "pa" ? "ਆਪਣਾ ਸਵਾਲ ਲਿਖੋ..." : "Ask me anything about EcoTrace..."} aria-label="Chat message" className="min-w-0 flex-1 resize-none bg-transparent py-2 text-[13px] leading-5 text-slate-900 dark:text-emerald-50 placeholder:text-slate-400 outline-none max-h-24" />
          <button type="button" onClick={startVoice} title={listening ? "Stop voice input" : "Speak your question (supported browsers)"} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${listening ? "bg-rose-100 text-rose-600 animate-pulse" : "text-slate-400 hover:bg-emerald-100 hover:text-emerald-700"}`}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
          <button type="submit" disabled={!draft.trim() || loading} title="Send message" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white disabled:opacity-45 hover:bg-emerald-600 transition"><ArrowUp className="h-4 w-4" /></button>
        </form>
        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-500 dark:text-emerald-200/60"><AudioLines className="h-3 w-3 shrink-0" />{providerConfigured ? "OpenRouter for general chat · private records stay on our server" : "7 local languages · AI temporarily unavailable"} · Sample wallet only</p>
      </div>
    </div>}
  </>;
}
