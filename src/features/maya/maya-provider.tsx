"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Languages, MessageCircleReply, RefreshCw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, UserRoundPen, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MayaContextMessage, MayaOpenContext } from "./types";
import type { MayaMode, MayaRequest, MayaResponse } from "@/lib/maya/schemas";

type MayaContextValue = { openMaya: (context?: MayaOpenContext) => void; closeMaya: () => void };
const MayaContext = createContext<MayaContextValue | null>(null);

const actions: Array<{ mode: MayaMode; action: string; label: string; detail: string; icon: typeof Sparkles }> = [
  { mode: "conversation_coach", action: "help_reply", label: "Help me reply", detail: "Up to 3 editable options", icon: MessageCircleReply },
  { mode: "conversation_coach", action: "opener", label: "Give me an opener", detail: "Based on shared profile details", icon: Sparkles },
  { mode: "profile_coach", action: "improve_profile", label: "Improve my profile", detail: "Keep every fact true", icon: UserRoundPen },
  { mode: "translation", action: "translate", label: "Translate a message", detail: "Nepali, English, Roman Nepali, Hindi", icon: Languages },
  { mode: "safety_check", action: "check_message", label: "Check a message", detail: "Look for possible warning signs", icon: ShieldCheck },
  { mode: "bhetau_help", action: "product_help", label: "How does Bhetau work?", detail: "Answers from Bhetau help", icon: ChevronRight },
];

export function MayaProvider({ children, initialEngine = "AI assistant" }: { children: React.ReactNode; initialEngine?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<MayaOpenContext>({});
  const [enabled, setEnabled] = useState(true);
  const [engine, setEngine] = useState(initialEngine);
  const [floatingHidden, setFloatingHidden] = useState(false);
  const preferencesLoaded = useRef(false);
  useEffect(() => {
    const onPreference = (event: Event) => setEnabled((event as CustomEvent<{ enabled: boolean }>).detail.enabled);
    const onFloatingVisibility = (event: Event) => setFloatingHidden(Boolean((event as CustomEvent<{ hidden?: boolean }>).detail?.hidden));
    window.addEventListener("bhetau:maya-enabled", onPreference);
    window.addEventListener("bhetau:maya-floating-visibility", onFloatingVisibility);
    return () => {
      window.removeEventListener("bhetau:maya-enabled", onPreference);
      window.removeEventListener("bhetau:maya-floating-visibility", onFloatingVisibility);
    };
  }, []);
  const openMaya = useCallback((context: MayaOpenContext = {}) => {
    setSeed(context);
    setOpen(true);
    if (preferencesLoaded.current) return;
    preferencesLoaded.current = true;
    void fetch("/api/maya/preferences")
      .then((response) => response.ok ? response.json() : null)
      .then((body) => {
        if (typeof body?.preferences?.enabled === "boolean") setEnabled(body.preferences.enabled);
        if (typeof body?.engine === "string") setEngine(body.engine);
      })
      .catch(() => undefined);
  }, []);
  const closeMaya = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openMaya, closeMaya }), [closeMaya, openMaya]);
  const isChatDetail = /^\/chats\/[^/]+$/.test(pathname);
  const triggerPosition = pathname === "/discover"
    ? "top-[max(112px,calc(env(safe-area-inset-top)+96px))] md:top-[calc(max(24px,(100dvh-820px)/2)+112px)]"
    : isChatDetail
      ? "bottom-[max(190px,calc(env(safe-area-inset-bottom)+178px))] md:bottom-[calc(max(24px,(100dvh-820px)/2)+190px)]"
      : "bottom-[max(104px,calc(env(safe-area-inset-bottom)+92px))] md:bottom-[calc(max(24px,(100dvh-820px)/2)+104px)]";
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const floatingLayer = <>
    {enabled && !open && !floatingHidden ? <motion.button
      type="button"
      drag
      dragMomentum={false}
      dragElastic={0.06}
      dragConstraints={{ left: -290, right: 0, top: -180, bottom: 180 }}
      whileDrag={{ scale: 1.06 }}
      onClick={(event) => {
        event.stopPropagation();
        openMaya();
      }}
      className={`fixed right-4 z-[60] grid size-14 cursor-grab touch-none place-items-center rounded-full border border-crimson/20 bg-gradient-to-br from-[#fff7f5] to-[#ffe5e9] text-wine shadow-[0_14px_36px_rgba(143,24,55,.26)] outline-none ring-offset-2 ring-offset-background transition duration-150 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-crimson dark:from-[#31171f] dark:to-[#211318] dark:text-[#ff9aac] md:right-[calc((100vw-430px)/2+16px)] ${triggerPosition}`}
      aria-label="Open Maya AI assistant"
    >
      <Sparkles size={22}/>
      <span className="absolute -right-1 -top-1 rounded-full bg-ink px-1.5 py-0.5 text-[8px] font-bold text-ivory">AI</span>
    </motion.button> : null}
    <AnimatePresence>{open ? <MayaSheet initialContext={seed} engine={engine} onClose={closeMaya}/> : null}</AnimatePresence>
  </>;

  return <MayaContext.Provider value={value}>
    {children}
    {floatingLayer}
  </MayaContext.Provider>;
}

export function useMaya() {
  const context = useContext(MayaContext);
  if (!context) throw new Error("useMaya must be used inside MayaProvider");
  return context;
}

function MayaSheet({ initialContext, engine, onClose }: { initialContext: MayaOpenContext; engine: string; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<MayaMode | null>(initialContext.mode ?? null);
  const [action, setAction] = useState(initialContext.action ?? "");
  const [input, setInput] = useState(initialContext.input ?? initialContext.selectedMessage?.text ?? "");
  const [tone, setTone] = useState<MayaRequest["tone"]>("friendly");
  const [targetLanguage, setTargetLanguage] = useState<MayaRequest["targetLanguage"]>("en");
  const [result, setResult] = useState<MayaResponse | null>(null);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const choose = (nextMode: MayaMode, nextAction: string) => { setMode(nextMode); setAction(nextAction); setResult(null); setError(""); setRetryable(true); };
  const submit = async () => {
    if (!mode) return;
    setLoading(true); setError(""); setRetryable(true); setResult(null); setNotice("");
    const payload: MayaRequest = {
      mode, action: action || mode, input: input.trim(), tone, preferredLanguage: "en", targetLanguage,
      selectedMessage: initialContext.selectedMessage,
      recentMessages: (initialContext.recentMessages ?? []).slice(-10),
      currentUserProfile: initialContext.currentUserProfile,
      matchProfile: initialContext.matchProfile,
      conversationId: initialContext.conversationId,
    };
    const response = await fetch("/api/maya", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    setLoading(false);
    if (!response?.ok || !body?.response) {
      setError(typeof body?.error === "string" ? body.error : "Maya couldn’t respond right now.");
      setRetryable(body?.retryable !== false);
      return;
    }
    setResult(body.response); setRequestId(body.requestId ?? "");
  };

  const feedback = async (helpful: boolean) => {
    if (!requestId) { setNotice("Feedback noted in demo mode."); return; }
    await fetch("/api/maya/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, rating: helpful ? 1 : -1, feedbackType: helpful ? "helpful" : "not_helpful" }) });
    setNotice("Thanks—your feedback helps improve Maya.");
  };

  return <motion.div className="fixed inset-0 z-[80] bg-black/48 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.section role="dialog" aria-modal="true" aria-labelledby="maya-title" onClick={(event) => event.stopPropagation()} initial={reduced ? { opacity: 0 } : { y: "100%" }} animate={reduced ? { opacity: 1 } : { y: 0 }} exit={reduced ? { opacity: 0 } : { y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="fixed inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] min-h-[520px] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-background shadow-2xl md:bottom-[max(24px,calc((100dvh-820px)/2))] md:max-h-[760px] md:rounded-[28px]">
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-foreground/15"/>
      <header className="flex items-center gap-3 border-b px-5 pb-4 pt-3"><button type="button" onClick={() => mode && !initialContext.mode ? setMode(null) : onClose()} className="grid size-11 place-items-center rounded-full border" aria-label={mode && !initialContext.mode ? "Back to Maya actions" : "Close Maya"}>{mode && !initialContext.mode ? <ArrowLeft size={18}/> : <X size={18}/>}</button><span className="grid size-11 place-items-center rounded-[16px] bg-gradient-to-br from-crimson/15 to-wine/10 text-crimson"><Sparkles size={20}/></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 id="maya-title" className="text-lg font-semibold">Maya</h2><span className="rounded-full bg-crimson/10 px-2 py-0.5 text-[9px] font-bold tracking-[.12em] text-crimson">AI</span></div><p className="text-xs text-stone">{engine === "Google Gemini" ? "Powered by Google Gemini" : "Private AI guidance inside Bhetau"}</p></div></header>
      <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-5">
        {!mode ? <InitialActions choose={choose}/> : <>
          <div className="rounded-[20px] border bg-surface p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-crimson">Clearly disclosed AI</p><p className="mt-2 text-xs leading-5 text-stone">Maya gives optional, editable assistance. She is not a dating profile and never sends messages for you.</p></div>
          {!result && !loading && <MayaComposer mode={mode} input={input} setInput={setInput} tone={tone} setTone={setTone} targetLanguage={targetLanguage} setTargetLanguage={setTargetLanguage} selectedMessage={initialContext.selectedMessage}/>} 
          {loading && <div role="status" className="py-14 text-center"><div className="mx-auto flex w-fit gap-1.5" aria-hidden>{[0,1,2].map((item) => <motion.span key={item} className="size-2 rounded-full bg-crimson" animate={reduced ? undefined : { y: [0,-5,0], opacity: [.4,1,.4] }} transition={{ repeat: Infinity, duration: .9, delay: item*.12 }}/>)}</div><p className="mt-4 text-sm font-medium">Maya is thinking…</p><p className="mt-1 text-xs text-stone">Only the context needed for this request is processed.</p></div>}
          {error && <div role="alert" className="mt-4 rounded-[20px] border border-crimson/20 bg-crimson/7 p-4"><p className="font-semibold text-crimson">Maya couldn’t complete that request.</p><p className="mt-1 text-xs leading-5 text-stone">{error} Your normal chat still works.</p>{retryable ? <Button variant="secondary" size="sm" onClick={submit} className="mt-4"><RefreshCw size={15}/>Try again</Button> : null}</div>}
          {result && <MayaResult result={result} showOriginal={showOriginal} setShowOriginal={setShowOriginal} applySuggestion={(text) => { if (initialContext.onUseSuggestion) { initialContext.onUseSuggestion(text); setNotice("Added to your draft. Review it before sending."); } else { navigator.clipboard?.writeText(text); setNotice("Suggestion copied. Review and edit it before using."); } }} safetyAction={(label) => setNotice(`${label} selected. Use the chat safety menu to confirm.`)}/>} 
          {notice && <div role="status" className="mt-4 rounded-2xl bg-success/10 px-4 py-3 text-xs font-medium text-success">{notice}</div>}
          {result && <div className="mt-5 flex items-center justify-between border-t pt-4"><p className="text-xs text-stone">Was this helpful?</p><div className="flex gap-2"><button type="button" onClick={() => feedback(true)} className="grid size-11 place-items-center rounded-full border" aria-label="Maya response was helpful"><ThumbsUp size={16}/></button><button type="button" onClick={() => feedback(false)} className="grid size-11 place-items-center rounded-full border" aria-label="Maya response was not helpful"><ThumbsDown size={16}/></button></div></div>}
        </>}
      </div>
      {mode && !result && !loading && <div className="border-t bg-surface px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3"><Button onClick={submit} disabled={!input.trim() && mode !== "match_insight"} className="w-full"><Sparkles size={17}/>Ask Maya</Button></div>}
    </motion.section>
  </motion.div>;
}

function InitialActions({ choose }: { choose: (mode: MayaMode, action: string) => void }) {
  return <><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-crimson">MAYA · AI ASSISTANT</p><h3 className="mt-2 text-2xl font-semibold tracking-[-.03em]">What can I help with?</h3><p className="mt-2 text-sm leading-6 text-stone">Short, private assistance when you ask for it.</p></div><div className="space-y-2">{actions.map(({ mode, action, label, detail, icon: Icon }) => <button type="button" key={action} onClick={() => choose(mode, action)} className="flex min-h-[68px] w-full items-center gap-3 rounded-[20px] border bg-surface px-4 text-left transition hover:border-crimson/30"><span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-crimson/8 text-crimson"><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-stone">{detail}</span></span><ChevronRight size={17} className="text-stone"/></button>)}</div><p className="mt-5 text-center text-[10px] leading-4 text-stone">Maya is AI—not a person or match. Nothing is sent without your explicit action.</p></>;
}

function MayaComposer({ mode, input, setInput, tone, setTone, targetLanguage, setTargetLanguage, selectedMessage }: { mode: MayaMode; input: string; setInput: (value: string) => void; tone: MayaRequest["tone"]; setTone: (value: MayaRequest["tone"]) => void; targetLanguage: MayaRequest["targetLanguage"]; setTargetLanguage: (value: MayaRequest["targetLanguage"]) => void; selectedMessage?: MayaContextMessage }) {
  const labels: Record<MayaMode, { title: string; placeholder: string }> = {
    profile_coach: { title: "What should Maya improve?", placeholder: "Paste your bio or prompt answer…" },
    conversation_coach: { title: "What do you want help with?", placeholder: "Paste a message or describe the opener you want…" },
    match_insight: { title: "Understand shared signals", placeholder: "Ask about this match…" },
    translation: { title: "Translate faithfully", placeholder: "Paste a message…" },
    safety_check: { title: "Check for warning signs", placeholder: "Paste the message that concerned you…" },
    bhetau_help: { title: "Ask about Bhetau", placeholder: "How do I hide my profile?" },
  };
  return <div className="mt-5"><h3 className="text-lg font-semibold">{labels[mode].title}</h3>{selectedMessage && <div className="mt-3 rounded-[18px] border-l-4 border-crimson bg-surface p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-stone">Selected message</p><p className="mt-2 text-sm leading-6">“{selectedMessage.text}”</p></div>}<label className="mt-4 block"><span className="sr-only">Message for Maya</span><textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={5} placeholder={labels[mode].placeholder} className="w-full resize-none rounded-[20px] border bg-surface p-4 text-sm leading-6 outline-none"/></label>{mode === "conversation_coach" && <label className="mt-4 block text-xs font-semibold text-stone">Tone<select value={tone} onChange={(event) => setTone(event.target.value as MayaRequest["tone"])} className="mt-2 h-12 w-full rounded-2xl border bg-surface px-3 text-sm text-foreground">{["friendly","playful","confident","casual","direct","respectful"].map((item) => <option key={item} value={item}>{item[0].toUpperCase()+item.slice(1)}</option>)}</select></label>}{mode === "translation" && <label className="mt-4 block text-xs font-semibold text-stone">Translate to<select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value as MayaRequest["targetLanguage"])} className="mt-2 h-12 w-full rounded-2xl border bg-surface px-3 text-sm text-foreground"><option value="en">English</option><option value="ne">नेपाली</option><option value="roman-ne">Roman Nepali</option><option value="hi">Hindi</option></select></label>}</div>;
}

function MayaResult({ result, showOriginal, setShowOriginal, applySuggestion, safetyAction }: { result: MayaResponse; showOriginal: boolean; setShowOriginal: (value: boolean) => void; applySuggestion: (text: string) => void; safetyAction: (label: string) => void }) {
  const isRisk = result.safety.riskLevel !== "none";
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5"><div className={`rounded-[22px] border p-5 ${isRisk ? "border-crimson/25 bg-crimson/7" : "bg-surface"}`}><div className="flex items-center gap-2">{isRisk ? <AlertTriangle size={18} className="text-crimson"/> : <Sparkles size={18} className="text-crimson"/>}<h3 className="font-semibold">{result.title}</h3></div><p className="mt-3 text-sm leading-6 text-stone">{result.summary}</p>{result.translation && <div className="mt-4 rounded-2xl bg-background p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-stone">{showOriginal ? "Original" : "Translated"}</p><p className="mt-2 text-base leading-7">{showOriginal ? result.translation.original : result.translation.translated}</p><button type="button" onClick={() => setShowOriginal(!showOriginal)} className="mt-3 min-h-11 text-xs font-semibold text-crimson">{showOriginal ? "Show translation" : "Show original"}</button></div>}{result.suggestions.length > 0 && <div className="mt-4 space-y-2">{result.suggestions.map((suggestion, index) => <div key={`${suggestion.text}-${index}`} className="rounded-2xl border bg-background p-4"><p className="text-sm leading-6">{suggestion.text}</p><button type="button" onClick={() => applySuggestion(suggestion.text)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-crimson"><Check size={15}/>Use this suggestion</button></div>)}</div>}{isRisk && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => applySuggestion(result.suggestions[0]?.text ?? "I’m not comfortable with that.")} className="min-h-11 rounded-full border bg-background px-3 text-xs font-semibold">Draft safe reply</button>{result.safety.recommendedActions.includes("block") && <button type="button" onClick={() => safetyAction("Block")} className="min-h-11 rounded-full border bg-background px-3 text-xs font-semibold">Block</button>}<button type="button" onClick={() => safetyAction("Report")} className="min-h-11 rounded-full bg-crimson px-3 text-xs font-semibold text-white">Report</button><button type="button" onClick={() => safetyAction("Dismiss")} className="min-h-11 px-3 text-xs font-semibold text-stone">Dismiss</button></div>}</div><p className="mt-3 px-2 text-[10px] leading-4 text-stone">{result.disclosure}</p></motion.div>;
}
