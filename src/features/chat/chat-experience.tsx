"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Ban, CheckCheck, ChevronDown, Copy, Flag, ImagePlus, MoreHorizontal, Reply, Send, ShieldCheck, Smile, Sparkles, UserRoundX, X } from "lucide-react";
import { Portrait } from "@/components/profile/portrait";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/data/profiles";
import { useMaya } from "@/features/maya/maya-provider";
import type { Profile, DemoMessage } from "@/types/domain";

const starters = ["You both selected trekking — ask which trail they’d repeat.", "You both like coffee — ask for their most overrated café take."];

export function ChatExperience({ profile }: { profile: Profile }) {
  const { openMaya } = useMaya();
  const [messages, setMessages] = useState<DemoMessage[]>([
    { id: "1", sender: "them", text: `Hey! Your answer about quiet weekends made me smile.`, timestamp: "10:21" },
    { id: "2", sender: "me", text: "Then I have to ask: coffee before the walk, or after?", timestamp: "10:24", status: "read" },
    { id: "3", sender: "them", text: "Both is the only correct answer 🙂", timestamp: "10:25" },
  ]);
  const [draft, setDraft] = useState("");
  const [starter, setStarter] = useState(starters[0]);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [mayaMenuFor, setMayaMenuFor] = useState<string | null>(null);
  const send = (event: FormEvent) => { event.preventDefault(); const text = draft.trim(); if (!text) return; const id = crypto.randomUUID(); setMessages((items) => [...items, { id, sender: "me", text, timestamp: "now", status: "sending" }]); setDraft(""); window.setTimeout(() => setMessages((items) => items.map((item) => item.id === id ? { ...item, status: "sent" } : item)), 450); };
  const safetyAction = (label: string) => { setMenu(false); setNotice(`${label} flow completed in demo mode.`); };
  const askMaya = (message: DemoMessage, mode: "conversation_coach" | "translation" | "safety_check", action: string) => {
    openMaya({
      mode,
      action,
      input: message.text,
      selectedMessage: { id: message.id, sender: message.sender === "me" ? "user" : "match", text: message.text },
      recentMessages: messages.slice(-10).map((item) => ({ id: item.id, sender: item.sender === "me" ? "user" : "match", text: item.text })),
      currentUserProfile: { firstName: currentUser.firstName, relationshipIntention: currentUser.intent, interests: currentUser.interests, languages: currentUser.languages, promptAnswers: [] },
      matchProfile: { firstName: profile.firstName, relationshipIntention: profile.intent, interests: profile.interests, languages: profile.languages, bio: profile.bio, promptAnswers: [profile.answer] },
      onUseSuggestion: setDraft,
    });
    setMayaMenuFor(null);
  };
  return <div className="flex h-[calc(100dvh-84px)] max-h-[736px] min-h-[620px] flex-col">
    <header className="relative flex min-h-[76px] items-center gap-3 border-b bg-surface/85 px-3 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur"><Link href="/chats" aria-label="Back to chats" className="grid size-11 place-items-center rounded-full"><ArrowLeft size={20}/></Link><Portrait quadrant={profile.portrait} alt={`Fictional portrait of ${profile.firstName}`} className="size-11 rounded-full"/><div className="min-w-0 flex-1"><p className="truncate font-semibold">{profile.firstName} {profile.verified && <span className="text-success">✓</span>}</p><p className="text-xs text-stone">Matched recently · {profile.city}</p></div><button onClick={() => setMenu(!menu)} className="grid size-11 place-items-center rounded-full border" aria-label="Open safety menu"><MoreHorizontal size={20}/></button>
    {menu && <div className="absolute right-3 top-18 z-30 w-56 rounded-2xl border bg-surface p-2 shadow-2xl"><Link href="/safety" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><ShieldCheck size={18}/>Safety center</Link><button onClick={() => safetyAction("Unmatch")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><UserRoundX size={18}/>Unmatch</button><button onClick={() => safetyAction("Block")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><Ban size={18}/>Block</button><button onClick={() => safetyAction("Report")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-crimson hover:bg-crimson/5"><Flag size={18}/>Report</button></div>}</header>
    {notice && <div role="status" className="mx-3 mt-3 flex items-center justify-between rounded-2xl bg-success/10 px-4 py-3 text-xs font-medium text-success">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
    <div className="border-b bg-[#fff4f1] px-4 py-3 dark:bg-[#21171a]"><div className="flex items-start gap-3"><Reply size={17} className="mt-0.5 shrink-0 text-crimson"/><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-crimson">Editable icebreaker</p><textarea value={starter} onChange={(e) => setStarter(e.target.value)} className="mt-1 min-h-10 w-full resize-none bg-transparent text-xs leading-5 outline-none"/><button onClick={() => setDraft(starter.replace(/^You both.*?— /, ""))} className="mt-1 min-h-8 text-xs font-semibold text-wine dark:text-[#ff9aac]">Use as a starting point</button></div><button onClick={() => setStarter(starters[1])} className="grid size-9 place-items-center rounded-full bg-surface" aria-label="Next icebreaker"><ChevronDown size={16}/></button></div></div>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-5"><p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-[.14em] text-stone">Today</p><div className="space-y-3">{messages.map((message) => <div key={message.id}><div className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}><button type="button" onClick={() => { setSelectedMessageId(selectedMessageId === message.id ? null : message.id); setMayaMenuFor(null); }} aria-label={`Message from ${message.sender === "me" ? "you" : profile.firstName}. Tap for actions.`} className={`max-w-[82%] rounded-[20px] px-4 py-3 text-left ${message.sender === "me" ? "rounded-br-md bg-ink text-ivory" : "rounded-bl-md bg-foreground/6"}`}><span className="block text-sm leading-6">{message.text}</span><span className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${message.sender === "me" ? "text-ivory/55" : "text-stone"}`}>{message.timestamp}{message.sender === "me" && <CheckCheck size={12} aria-label={message.status}/>}</span></button></div>{selectedMessageId === message.id && <div className={`mt-2 ${message.sender === "me" ? "ml-auto" : "mr-auto"} max-w-[92%] rounded-[18px] border bg-surface p-2 shadow-lg`}><div className="flex flex-wrap gap-1"><MessageAction icon={Reply} label="Reply" onClick={() => { setDraft(`“${message.text}”\n`); setSelectedMessageId(null); }}/><MessageAction icon={Smile} label="React" onClick={() => setNotice("Reaction UI opened in demo mode.")}/><MessageAction icon={Copy} label="Copy" onClick={() => navigator.clipboard.writeText(message.text).then(() => setNotice("Message copied."))}/><MessageAction icon={Sparkles} label="Ask Maya" emphasis onClick={() => setMayaMenuFor(mayaMenuFor === message.id ? null : message.id)}/><MessageAction icon={Flag} label="Report" onClick={() => safetyAction("Report")}/></div>{mayaMenuFor === message.id && <div className="mt-2 grid gap-1 border-t pt-2"><button type="button" onClick={() => askMaya(message, "conversation_coach", "explain_message")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold hover:bg-foreground/5">What does this mean?</button><button type="button" onClick={() => askMaya(message, "conversation_coach", "help_reply")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold hover:bg-foreground/5">Help me reply</button><button type="button" onClick={() => askMaya(message, "translation", "translate")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold hover:bg-foreground/5">Translate</button><button type="button" onClick={() => askMaya(message, "safety_check", "check_warning_signs")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold text-crimson hover:bg-crimson/5">Check for warning signs</button></div>}</div>}</div>)}</div></div>
    <form onSubmit={send} className="flex items-end gap-2 border-t bg-surface px-3 py-3"><button type="button" onClick={() => setNotice("Image attachment is a polished placeholder in this MVP.")} className="grid size-11 shrink-0 place-items-center rounded-full text-stone" aria-label="Attach image"><ImagePlus size={20}/></button><label className="min-h-11 flex-1 rounded-[20px] border bg-background px-4 py-3"><span className="sr-only">Message</span><textarea rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" className="max-h-28 w-full resize-none bg-transparent text-sm outline-none"/></label><Button size="icon" aria-label="Send message" disabled={!draft.trim()}><Send size={18}/></Button></form>
    <p className="bg-surface px-4 pb-2 text-center text-[9px] text-stone">Optional suggestions are always editable. Bhetau never speaks as you.</p>
  </div>;
}

function MessageAction({ icon: Icon, label, emphasis, onClick }: { icon: typeof Reply; label: string; emphasis?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold ${emphasis ? "bg-crimson/10 text-crimson" : "text-stone hover:bg-foreground/5"}`}><Icon size={14}/>{label}</button>;
}
