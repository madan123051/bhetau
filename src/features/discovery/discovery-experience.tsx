"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Ban, CheckCircle2, ChevronDown, Flag, Heart, MapPin, MessageCircle, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, UserRoundX, X } from "lucide-react";
import { Wordmark } from "@/components/brand/brand-mark";
import { Portrait } from "@/components/profile/portrait";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { currentUser, profiles } from "@/data/profiles";
import { demoMatchService } from "@/features/matching/mock-match-service";
import { useMaya } from "@/features/maya/maya-provider";
import { calculateVibeScore } from "@/lib/matching/vibe-score";
import type { Profile } from "@/types/domain";

const reportReasons = ["Fake profile", "Under 18", "Harassment", "Sexual content", "Scam", "Hate or abuse", "Impersonation", "Other"];

export type DiscoveryViewer = Pick<typeof currentUser, "firstName" | "ageRange" | "city" | "intent" | "interests" | "languages" | "lifestyle"> & {
  thumbnailUrl?: string | null;
};

export function DiscoveryExperience({ initialQueue, viewer, demoMode = true }: { initialQueue?: Profile[]; viewer?: DiscoveryViewer; demoMode?: boolean }) {
  const activeViewer = viewer ?? currentUser;
  const fallbackQueue = demoMode ? profiles : [];
  const [queue, setQueue] = useState(initialQueue ?? fallbackQueue);
  const [history, setHistory] = useState<Profile[]>([]);
  const [detail, setDetail] = useState(false);
  const [filters, setFilters] = useState(false);
  const [match, setMatch] = useState<{ profile: Profile; conversationId: string } | null>(null);
  const [toast, setToast] = useState("");
  const reduced = useReducedMotion();
  const profile = queue[0];
  const vibe = useMemo(() => profile ? calculateVibeScore(activeViewer, profile) : null, [activeViewer, profile]);

  const act = useCallback(async (action: "pass" | "like") => {
    if (!profile) return;
    setHistory((items) => [profile, ...items]);
    setQueue((items) => items.slice(1));
    setDetail(false);
    if (action === "like") {
      if (!demoMode) {
        const result = await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: profile.id }) }).then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) })).catch(() => ({ ok: false, data: null }));
        if (!result.ok) {
          setQueue((items) => [profile, ...items]);
          setHistory((items) => items.filter((item) => item.id !== profile.id));
          setToast(result.data?.error ?? "Couldn’t save that like. Please retry.");
          window.setTimeout(() => setToast(""), 2800);
          return;
        }
        setToast(`Liked ${profile.firstName}`);
        const conversationId = typeof result.data?.conversation_id === "string" ? result.data.conversation_id : typeof result.data?.conversationId === "string" ? result.data.conversationId : null;
        if (result.data?.matched && conversationId) window.setTimeout(() => setMatch({ profile, conversationId }), reduced ? 0 : 260);
      } else {
        const result = demoMatchService.like("demo-user", profile.id);
      setToast(`Liked ${profile.firstName}`);
      if (result.matched) window.setTimeout(() => setMatch({ profile, conversationId: result.conversationId ?? profile.id }), reduced ? 0 : 260);
      }
    } else setToast(`Passed ${profile.firstName}`);
    window.setTimeout(() => setToast(""), 1800);
  }, [demoMode, profile, reduced]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (detail || filters || match) return;
      if (event.key === "ArrowLeft") act("pass");
      if (event.key === "ArrowRight") act("like");
      if (event.key === "ArrowUp" || event.key === "Enter") setDetail(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, detail, filters, match]);

  const undo = () => { const [last, ...rest] = history; if (!last) return; setQueue((items) => [last, ...items]); setHistory(rest); setToast("Last choice restored"); };

  return (
    <>
      <header className="flex items-center justify-between px-5 pb-3 pt-[max(18px,env(safe-area-inset-top))]">
        <Wordmark compact />
        <div className="flex items-center gap-1"><button className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-semibold" aria-label="Change approximate area"><MapPin size={15} className="text-crimson"/> Around Patan <ChevronDown size={14}/></button><ThemeToggle/><Button variant="secondary" size="icon" onClick={() => setFilters(true)} aria-label="Open discovery filters"><SlidersHorizontal size={18}/></Button></div>
      </header>

      <main className="relative px-3">
        {profile ? <>
          <div className="relative h-[min(68vh,590px)] min-h-[510px]">
            <div className="absolute inset-3 translate-y-3 rounded-[26px] bg-[#dbcac5] opacity-60 dark:bg-[#282329]"/>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.article
                key={profile.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.55}
                onDragEnd={(_, info) => { if (info.offset.x > 95) act("like"); else if (info.offset.x < -95) act("pass"); }}
                initial={reduced ? false : { opacity: 0, scale: .975, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: .96, x: 120 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="soft-shadow absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-[24px] bg-black active:cursor-grabbing"
                aria-label={`${profile.firstName}${profile.age ? `, ${profile.age}` : ""}, ${profile.city}`}
              >
                <Portrait src={profile.thumbnailUrl} quadrant={profile.portrait} initials={profile.firstName} alt={profile.portrait ? `Fictional portrait of ${profile.firstName}` : `${profile.firstName}'s profile photo`} className="absolute inset-0 size-full" priority />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/5 to-black/5"/>
                <div className="absolute left-4 top-4 flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-black/42 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><Sparkles size={14} className="text-[#ffb2bf]"/>{vibe?.score}% vibe</span>{profile.verified && <span className="grid size-8 place-items-center rounded-full bg-white/92 text-success" title="Phone verified"><CheckCircle2 size={17}/><span className="sr-only">Phone verified</span></span>}</div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="flex items-end justify-between gap-4"><div><h1 className="text-4xl font-semibold tracking-[-.05em]">{profile.firstName}{profile.age ? `, ${profile.age}` : ""}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-white/76"><MapPin size={14}/>{profile.city}{profile.occupation ? ` · ${profile.occupation}` : ""}</p></div><span className="shrink-0 rounded-full border border-white/20 bg-white/12 px-3 py-2 text-xs font-semibold backdrop-blur">{profile.intent}</span></div>
                  <div className="mt-4 flex flex-wrap gap-2">{profile.interests.slice(0,3).map((interest) => <span key={interest} className="rounded-full bg-white/14 px-3 py-1.5 text-xs font-medium backdrop-blur">{interest}</span>)}</div>
                  <button onClick={() => setDetail(true)} className="mt-4 w-full rounded-2xl border border-white/16 bg-black/24 p-4 text-left backdrop-blur transition hover:bg-black/36"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ffbdc8]">{profile.prompt}</span><span className="mt-1 block text-[15px] font-medium leading-6">“{profile.answer}”</span></button>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-3">
            <Button variant="secondary" onClick={() => act("pass")} aria-label={`Pass on ${profile.firstName}`} className="h-14"><X size={21}/> Pass</Button>
            <button onClick={() => setDetail(true)} className="grid size-12 place-items-center rounded-full border bg-surface text-stone" aria-label={`View ${profile.firstName}’s full profile`}><UserRoundX size={19}/></button>
            <Button onClick={() => act("like")} aria-label={`Like ${profile.firstName}`} className="h-14"><Heart size={20} fill="currentColor"/> Like</Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-stone">Drag or use ← pass · ↑ profile · → like</p>
        </> : <div className="flex min-h-[620px] flex-col items-center justify-center px-8 text-center"><div className="grid size-20 place-items-center rounded-[28px] bg-crimson/10 text-crimson"><MapPin size={30}/></div><h1 className="mt-6 text-3xl font-semibold tracking-tight">Looks quiet around here.</h1><p className="mt-3 max-w-xs text-sm leading-6 text-stone">{demoMode ? "You’ve seen everyone in your current preferences. New people join all the time." : "No other completed, visible Bhetau profiles match your current discovery settings yet."}</p><Button onClick={() => { setQueue(fallbackQueue); setHistory([]); }} className="mt-7">Expand preferences</Button></div>}
        {history.length > 0 && profile && <button onClick={undo} className="absolute left-5 top-2 z-20 grid size-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur" aria-label="Undo last choice"><RotateCcw size={17}/></button>}
      </main>

      <AnimatePresence>{toast && <motion.div role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ivory shadow-xl md:absolute">{toast}</motion.div>}</AnimatePresence>
      <AnimatePresence>{detail && profile && <ProfileDetail profile={profile} vibe={vibe!} viewer={activeViewer} onClose={() => setDetail(false)} onAction={act}/>}</AnimatePresence>
      <AnimatePresence>{filters && <FilterSheet onClose={() => setFilters(false)}/>}</AnimatePresence>
      <AnimatePresence>{match && <MatchMoment profile={match.profile} conversationId={match.conversationId} viewer={activeViewer} demoMode={demoMode} onClose={() => setMatch(null)}/>}</AnimatePresence>
    </>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return <motion.div className="absolute inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="absolute inset-x-0 bottom-0 max-h-[90%] overflow-y-auto rounded-t-[28px] bg-background px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-foreground/15"/>{children}</motion.section></motion.div>;
}

function ProfileDetail({ profile, vibe, viewer, onClose, onAction }: { profile: Profile; vibe: ReturnType<typeof calculateVibeScore>; viewer: DiscoveryViewer; onClose: () => void; onAction: (action: "pass" | "like") => void }) {
  const { openMaya } = useMaya();
  const [safety, setSafety] = useState(false); const [reporting, setReporting] = useState(false); const [done, setDone] = useState("");
  return <Sheet label={`${profile.firstName} profile`} onClose={onClose}><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{profile.firstName}{profile.age ? `, ${profile.age}` : ""}</h2><div className="flex gap-1"><button onClick={() => setSafety(!safety)} className="grid size-11 place-items-center rounded-full border" aria-label="Safety options"><ShieldCheck size={19}/></button><button onClick={onClose} className="grid size-11 place-items-center rounded-full border" aria-label="Close profile"><X size={19}/></button></div></div>
  {safety && <div className="mt-3 grid gap-2 rounded-2xl border bg-surface p-2"><button onClick={() => setDone("Profile hidden. You won’t see each other in discovery.")} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><UserRoundX size={18}/>Hide profile</button><button onClick={() => setDone("Profile blocked. Messaging and discovery access are removed.")} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><Ban size={18}/>Block</button><button onClick={() => setReporting(true)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-crimson hover:bg-crimson/5"><Flag size={18}/>Report</button></div>}
  {done && <div role="status" className="mt-3 rounded-2xl bg-success/10 p-4 text-sm font-medium text-success">{done}</div>}
  {reporting && <div className="mt-4 rounded-2xl border p-4"><p className="font-semibold">Why are you reporting this profile?</p><div className="mt-3 flex flex-wrap gap-2">{reportReasons.map((reason) => <button key={reason} onClick={() => { setDone(`Report submitted: ${reason}.`); setReporting(false); }} className="min-h-11 rounded-full border px-3 text-xs font-medium hover:border-crimson">{reason}</button>)}</div></div>}
  <Portrait src={profile.thumbnailUrl} quadrant={profile.portrait} initials={profile.firstName} alt={profile.portrait ? `Fictional portrait of ${profile.firstName}` : `${profile.firstName}'s profile photo`} className="mt-4 aspect-[4/3] rounded-[24px]"/>
  <div className="mt-5 rounded-[22px] bg-crimson/7 p-5"><p className="flex items-center gap-2 text-sm font-bold text-wine dark:text-[#ff9aac]"><Sparkles size={17}/> {vibe.score}% Vibe Match</p><p className="mt-2 text-xs leading-5 text-stone">A helpful label based on what you shared—not a scientific compatibility score.</p><ul className="mt-4 space-y-2">{vibe.reasons.map((reason) => <li key={reason} className="flex gap-2 text-sm"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success"/>{reason}</li>)}</ul><button type="button" onClick={() => openMaya({ mode: "match_insight", action: "explain_vibe_match", currentUserProfile: { firstName: viewer.firstName, relationshipIntention: viewer.intent, interests: viewer.interests, languages: viewer.languages, promptAnswers: [] }, matchProfile: { firstName: profile.firstName, relationshipIntention: profile.intent, interests: profile.interests, languages: profile.languages, bio: profile.bio, promptAnswers: [profile.answer] } })} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-crimson/20 bg-background px-4 text-xs font-semibold text-crimson"><Sparkles size={15}/>Ask Maya why</button></div>
  <section className="py-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-stone">About</p><p className="mt-2 leading-7">{profile.bio}</p><div className="mt-4 flex flex-wrap gap-2">{[...profile.interests, ...profile.languages].map((item) => <span className="rounded-full border bg-surface px-3 py-2 text-xs" key={item}>{item}</span>)}</div></section>
  <div className="rounded-[22px] border bg-surface p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-crimson">{profile.prompt}</p><p className="mt-2 text-xl font-medium leading-8">“{profile.answer}”</p></div>
  <div className="sticky bottom-0 mt-6 grid grid-cols-2 gap-3 bg-background pt-3"><Button variant="secondary" onClick={() => onAction("pass")}><X size={19}/>Pass</Button><Button onClick={() => onAction("like")}><Heart size={19}/>Like</Button></div></Sheet>;
}

function FilterSheet({ onClose }: { onClose: () => void }) { const [age, setAge] = useState(32); return <Sheet label="Discovery filters" onClose={onClose}><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.14em] text-crimson">PREFERENCES</p><h2 className="mt-1 text-2xl font-semibold">Shape your discovery</h2></div><button onClick={onClose} className="grid size-11 place-items-center rounded-full border"><X size={19}/></button></div><div className="mt-7 space-y-6"><label className="block rounded-2xl border bg-surface p-4"><span className="flex justify-between text-sm font-semibold">Age range <b>22–{age}</b></span><input className="mt-4 w-full accent-[#e83c5b]" type="range" min="24" max="45" value={age} onChange={(e) => setAge(Number(e.target.value))}/></label><div className="rounded-2xl border bg-surface p-4"><p className="text-sm font-semibold">Approximate area</p><p className="mt-1 text-xs text-stone">Around Patan · Kathmandu Valley</p><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-stone"><MapPin size={15} className="mt-0.5 shrink-0"/>Bhetau never displays exact GPS distance.</p></div><label className="flex items-center justify-between rounded-2xl border bg-surface p-4"><span><b className="text-sm">Show verified profiles first</b><span className="mt-1 block text-xs text-stone">Phone or moderation verified</span></span><input type="checkbox" defaultChecked className="size-5 accent-[#e83c5b]"/></label></div><Button onClick={onClose} className="mt-7 w-full"><Settings2 size={18}/>Apply preferences</Button></Sheet>; }

function MatchMoment({ profile, conversationId, viewer, demoMode, onClose }: { profile: Profile; conversationId: string; viewer: DiscoveryViewer; demoMode: boolean; onClose: () => void }) { return <motion.div role="dialog" aria-modal="true" aria-label="Mutual match" className="absolute inset-0 z-[60] grid place-items-center bg-[#160e12]/88 px-6 text-white backdrop-blur-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .55 }}><div className="w-full text-center"><div className="mx-auto flex w-fit items-center justify-center"><motion.div initial={{ x: 28, scale: .75 }} animate={{ x: 7, scale: 1 }} transition={{ duration: .6 }} className="z-10 size-28 overflow-hidden rounded-full border-4 border-[#160e12]"><Portrait src={viewer.thumbnailUrl} quadrant={demoMode ? "tl" : undefined} initials={viewer.firstName} alt={`${viewer.firstName}'s profile photo`} className="size-full"/></motion.div><motion.div initial={{ x: -28, scale: .75 }} animate={{ x: -7, scale: 1 }} transition={{ duration: .6 }} className="size-28 overflow-hidden rounded-full border-4 border-[#160e12]"><Portrait src={profile.thumbnailUrl} quadrant={profile.portrait} initials={profile.firstName} alt={profile.portrait ? `Fictional portrait of ${profile.firstName}` : `${profile.firstName}'s profile photo`} className="size-full"/></motion.div></div><p className="mt-8 font-devanagari text-sm font-semibold text-[#ff9aac]">भेटौँ</p><h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">It’s a Bhetau!</h2><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/65">You and {profile.firstName} liked each other. Start with something you actually share.</p><Link href={`/chats/${conversationId}`} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#ff5a72] to-[#d72c55] font-semibold"><MessageCircle size={19}/>Say hi</Link><Button variant="ghost" onClick={onClose} className="mt-3 w-full text-white hover:bg-white/8">Keep exploring</Button></div></motion.div>; }
