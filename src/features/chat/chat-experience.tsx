"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  Copy,
  Flag,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Reply,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Trash2,
  UserRoundX,
  X,
} from "lucide-react";
import { Portrait } from "@/components/profile/portrait";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/data/profiles";
import { useMaya } from "@/features/maya/maya-provider";
import { cn } from "@/lib/utils";
import type { DemoMessage, Profile } from "@/types/domain";

const starters = [
  "You both selected trekking — ask which trail they’d repeat.",
  "You both like coffee — ask for their most overrated café take.",
];

const reactionOptions = [
  { emoji: "❤️", label: "love" },
  { emoji: "😂", label: "laugh" },
  { emoji: "👍", label: "like" },
  { emoji: "😮", label: "surprised" },
  { emoji: "😢", label: "sad" },
  { emoji: "🔥", label: "fire" },
] as const;

type TimerHours = 6 | 12 | null;

function getOptimisticExpiry(hours: Exclude<TimerHours, null>) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

type JsonResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

async function requestJson(url: string, init: RequestInit): Promise<JsonResult> {
  try {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      return {
        ok: false,
        error: typeof payload?.error === "string" ? payload.error : "That change could not be saved. Please retry.",
      };
    }
    return { ok: true, data: payload ?? {} };
  } catch {
    return { ok: false, error: "You’re offline — reconnect and try again." };
  }
}

type ChatExperienceProps = {
  profile: Profile;
  conversationId: string;
  initialMessages?: DemoMessage[];
  initialTimerHours?: TimerHours;
  initialReadMessageId?: string;
  demoMode?: boolean;
};

export function ChatExperience({
  profile,
  conversationId,
  initialMessages,
  initialTimerHours = null,
  initialReadMessageId,
  demoMode = true,
}: ChatExperienceProps) {
  const { openMaya } = useMaya();
  const demoMessages: DemoMessage[] = [
    { id: "1", sender: "them", text: "Hey! Your answer about quiet weekends made me smile.", timestamp: "10:21" },
    { id: "2", sender: "me", text: "Then I have to ask: coffee before the walk, or after?", timestamp: "10:24", status: "read" },
    { id: "3", sender: "them", text: "Both is the only correct answer 🙂", timestamp: "10:25" },
  ];
  const [messages, setMessages] = useState<DemoMessage[]>(initialMessages ?? (demoMode ? demoMessages : []));
  const [draft, setDraft] = useState("");
  const [starter, setStarter] = useState(starters[0]);
  const [menu, setMenu] = useState(false);
  const [timerMenu, setTimerMenu] = useState(false);
  const [timerHours, setTimerHours] = useState<TimerHours>(initialTimerHours);
  const [timerPending, setTimerPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [mayaMenuFor, setMayaMenuFor] = useState<string | null>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>(() => Object.fromEntries(
    (initialMessages ?? (demoMode ? demoMessages : [])).flatMap((message) => {
      const mine = message.reactions?.find((reaction) => reaction.mine);
      return mine ? [[message.id, mine.emoji]] : [];
    }),
  ));
  const [replyingTo, setReplyingTo] = useState<DemoMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DemoMessage | null>(null);
  const [confirmUnsendId, setConfirmUnsendId] = useState<string | null>(null);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clock, setClock] = useState<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const visibleMessages = clock === null
    ? messages
    : messages.filter((message) => !message.expiresAt || new Date(message.expiresAt).getTime() > clock);
  const floatingMayaWouldObstruct = Boolean(selectedMessageId || timerMenu || menu || replyingTo || editingMessage || profileOpen);

  useEffect(() => {
    const timeout = window.setTimeout(() => setClock(Date.now()), 0);
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [visibleMessages.length]);

  useEffect(() => {
    if (demoMode || !initialReadMessageId) return;
    const controller = new AbortController();
    void requestJson("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", conversationId, messageId: initialReadMessageId }),
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [conversationId, demoMode, initialReadMessageId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bhetau:maya-floating-visibility", { detail: { hidden: floatingMayaWouldObstruct } }));
  }, [floatingMayaWouldObstruct]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("bhetau:maya-floating-visibility", { detail: { hidden: false } }));
  }, []);

  const focusComposer = () => window.setTimeout(() => composerRef.current?.focus(), 0);

  const closeMessageActions = () => {
    setSelectedMessageId(null);
    setMayaMenuFor(null);
    setEmojiFor(null);
    setConfirmUnsendId(null);
    setSwipeOpenId(null);
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pendingMessageId) return;

    if (editingMessage) {
      const original = editingMessage;
      setPendingMessageId(original.id);
      setMessages((items) => items.map((item) => item.id === original.id ? { ...item, text, edited: true } : item));
      setDraft("");
      setEditingMessage(null);

      if (!demoMode) {
        const result = await requestJson("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "edit", messageId: original.id, text }),
        });
        if (!result.ok) {
          setMessages((items) => items.map((item) => item.id === original.id ? original : item));
          setDraft(text);
          setEditingMessage(original);
          setNotice(result.error);
          focusComposer();
        } else {
          setNotice("Message edited.");
        }
      } else {
        setNotice("Message edited.");
      }
      setPendingMessageId(null);
      return;
    }

    const optimisticId = crypto.randomUUID();
    const reply = replyingTo ? {
      id: replyingTo.id,
      sender: replyingTo.sender,
      text: replyingTo.deleted ? "Message unsent" : replyingTo.text,
    } : undefined;
    const expiresAt = timerHours ? getOptimisticExpiry(timerHours) : null;
    const optimisticMessage: DemoMessage = {
      id: optimisticId,
      sender: "me",
      text,
      timestamp: "now",
      status: "sending",
      replyTo: reply,
      expiresAt,
    };
    setMessages((items) => [...items, optimisticMessage]);
    setDraft("");
    setReplyingTo(null);

    if (demoMode) {
      window.setTimeout(() => {
        setMessages((items) => items.map((item) => item.id === optimisticId ? { ...item, status: "sent" } : item));
      }, 450);
      return;
    }

    const result = await requestJson("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, text, replyToId: replyingTo?.id ?? null }),
    });
    if (!result.ok) {
      setMessages((items) => items.filter((item) => item.id !== optimisticId));
      setDraft(text);
      setReplyingTo(replyingTo);
      setNotice(result.error);
      focusComposer();
      return;
    }
    setMessages((items) => items.map((item) => item.id === optimisticId ? {
      ...item,
      id: typeof result.data.id === "string" ? result.data.id : optimisticId,
      expiresAt: typeof result.data.expires_at === "string" ? result.data.expires_at : expiresAt,
      status: "sent",
    } : item));
  };

  const beginReply = (message: DemoMessage) => {
    setEditingMessage(null);
    setReplyingTo(message);
    closeMessageActions();
    focusComposer();
  };

  const beginEdit = (message: DemoMessage) => {
    setReplyingTo(null);
    setEditingMessage(message);
    setDraft(message.text);
    closeMessageActions();
    focusComposer();
  };

  const unsend = async (message: DemoMessage) => {
    const previousReaction = reactions[message.id];
    setPendingMessageId(message.id);
    setMessages((items) => items.map((item) => item.id === message.id ? {
      ...item,
      text: "Message unsent",
      deleted: true,
      edited: false,
      replyTo: undefined,
    } : item));
    setReactions((items) => {
      const next = { ...items };
      delete next[message.id];
      return next;
    });
    closeMessageActions();

    if (!demoMode) {
      const result = await requestJson("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsend", messageId: message.id }),
      });
      if (!result.ok) {
        setMessages((items) => items.map((item) => item.id === message.id ? message : item));
        if (previousReaction) setReactions((items) => ({ ...items, [message.id]: previousReaction }));
        setNotice(result.error);
      } else {
        setNotice("Message unsent for everyone.");
      }
    } else {
      setNotice("Message unsent for everyone.");
    }
    setPendingMessageId(null);
  };

  const setReaction = async (messageId: string, emoji: string) => {
    const previous = reactions[messageId];
    const nextEmoji = previous === emoji || !emoji ? null : emoji;
    setReactions((items) => {
      if (nextEmoji === null) {
        const next = { ...items };
        delete next[messageId];
        return next;
      }
      return { ...items, [messageId]: nextEmoji };
    });
    setEmojiFor(null);
    setSelectedMessageId(null);
    setSwipeOpenId(null);

    if (demoMode) return;
    const result = await requestJson("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react", messageId, emoji: nextEmoji }),
    });
    if (!result.ok) {
      setReactions((items) => {
        const next = { ...items };
        if (previous) next[messageId] = previous;
        else delete next[messageId];
        return next;
      });
      setNotice(result.error);
    }
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Message copied.");
    } catch {
      setNotice("Copy is unavailable in this browser.");
    }
    closeMessageActions();
  };

  const changeTimer = async (hours: TimerHours) => {
    const previous = timerHours;
    setTimerHours(hours);
    setTimerMenu(false);
    setTimerPending(true);

    if (!demoMode) {
      const result = await requestJson("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "timer", conversationId, hours }),
      });
      if (!result.ok) {
        setTimerHours(previous);
        setNotice(result.error);
        setTimerPending(false);
        return;
      }
    }
    setNotice(hours ? `New messages will disappear after ${hours} hours.` : "Disappearing messages turned off.");
    setTimerPending(false);
  };

  const safetyAction = (label: string) => {
    setMenu(false);
    setNotice(`${label} flow completed in demo mode.`);
  };

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
    closeMessageActions();
  };

  return (
    <div className="flex h-[calc(100dvh-var(--product-nav-height))] min-h-0 flex-col overflow-hidden md:h-[calc(820px-var(--product-nav-height))]">
      <header className="relative flex min-h-[76px] items-center gap-2 border-b bg-surface/85 px-3 pt-[max(8px,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/chats" aria-label="Back to chats" className="grid size-11 shrink-0 place-items-center rounded-full">
          <ArrowLeft size={20}/>
        </Link>
        <button type="button" onClick={() => setProfileOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl text-left" aria-label={`Open ${profile.firstName}'s profile`}>
          <Portrait quadrant={profile.portrait} initials={profile.firstName} alt={profile.portrait ? `Fictional portrait of ${profile.firstName}` : `${profile.firstName}'s profile placeholder`} className="size-11 shrink-0 rounded-full"/>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{profile.firstName} {profile.verified ? <span className="text-success">✓</span> : null}</span>
            <span className="block truncate text-xs text-stone">View profile · {profile.city}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setTimerMenu((open) => !open); setMenu(false); }}
          className={cn("relative grid size-11 shrink-0 place-items-center rounded-full border", timerHours && "border-crimson/30 bg-crimson/10 text-crimson")}
          aria-label={timerHours ? `Disappearing messages: ${timerHours} hours` : "Set disappearing messages"}
          aria-expanded={timerMenu}
          disabled={timerPending}
        >
          <Clock3 size={19}/>
          {timerHours ? <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-crimson text-[8px] font-bold text-white">{timerHours}</span> : null}
        </button>
        <button type="button" onClick={() => { setMenu((open) => !open); setTimerMenu(false); }} className="grid size-11 shrink-0 place-items-center rounded-full border" aria-label="Open safety menu" aria-expanded={menu}>
          <MoreHorizontal size={20}/>
        </button>

        {timerMenu ? (
          <div className="absolute right-14 top-[72px] z-40 w-60 rounded-2xl border bg-surface p-2 shadow-2xl" role="menu" aria-label="Disappearing messages">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.12em] text-stone">Disappearing messages</p>
            {([null, 6, 12] as const).map((hours) => (
              <button
                type="button"
                key={hours ?? "off"}
                role="menuitemradio"
                aria-checked={timerHours === hours}
                onClick={() => changeTimer(hours)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium hover:bg-foreground/5"
              >
                {hours ? `${hours} hours` : "Off"}
                {timerHours === hours ? <Check size={16} className="text-crimson"/> : null}
              </button>
            ))}
            <p className="px-3 py-2 text-[10px] leading-4 text-stone">The timer applies to new messages after they are sent.</p>
          </div>
        ) : null}

        {menu ? (
          <div className="absolute right-3 top-[72px] z-40 w-56 rounded-2xl border bg-surface p-2 shadow-2xl">
            <Link href="/safety" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><ShieldCheck size={18}/>Safety center</Link>
            <button type="button" onClick={() => safetyAction("Unmatch")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><UserRoundX size={18}/>Unmatch</button>
            <button type="button" onClick={() => safetyAction("Block")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-foreground/5"><Ban size={18}/>Block</button>
            <button type="button" onClick={() => safetyAction("Report")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-crimson hover:bg-crimson/5"><Flag size={18}/>Report</button>
          </div>
        ) : null}
      </header>

      {notice ? (
        <div role="status" className="mx-3 mt-3 flex items-center justify-between rounded-2xl bg-success/10 px-4 py-3 text-xs font-medium text-success">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="grid size-8 place-items-center" aria-label="Dismiss notification"><X size={15}/></button>
        </div>
      ) : null}

      <div className="border-b bg-[#fff4f1] px-4 py-3 dark:bg-[#21171a]">
        <div className="flex items-start gap-3">
          <Reply size={17} className="mt-0.5 shrink-0 text-crimson"/>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-crimson">Editable icebreaker</p>
            <textarea value={starter} onChange={(event) => setStarter(event.target.value)} className="mt-1 min-h-10 w-full resize-none bg-transparent text-xs leading-5 outline-none" aria-label="Editable icebreaker"/>
            <button type="button" onClick={() => { setDraft(starter.replace(/^You both.*?— /, "")); focusComposer(); }} className="mt-1 min-h-8 text-xs font-semibold text-wine dark:text-[#ff9aac]">Use as a starting point</button>
          </div>
          <button type="button" onClick={() => setStarter(starters[1])} className="grid size-9 place-items-center rounded-full bg-surface" aria-label="Next icebreaker"><ChevronDown size={16}/></button>
        </div>
      </div>

      {timerHours ? (
        <div className="flex items-center justify-center gap-1.5 border-b bg-crimson/5 px-3 py-2 text-[10px] font-medium text-wine dark:text-[#ff9aac]">
          <Clock3 size={13}/> New messages disappear {timerHours} hours after sending
        </div>
      ) : null}

      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5" onClick={() => setSwipeOpenId(null)}>
        <p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-[.14em] text-stone">Today</p>
        <div className="space-y-3">
          {visibleMessages.map((message) => (
            <div key={message.id}>
              <SwipeableMessage
                message={message}
                profileName={profile.firstName}
                reaction={formatReactionSummary(message, reactions[message.id])}
                selected={selectedMessageId === message.id}
                swipeOpen={swipeOpenId === message.id}
                pending={pendingMessageId === message.id || message.status === "sending"}
                onToggle={() => {
                  if (message.deleted) return;
                  setSelectedMessageId((selected) => selected === message.id ? null : message.id);
                  setMayaMenuFor(null);
                  setEmojiFor(null);
                  setConfirmUnsendId(null);
                  setSwipeOpenId(null);
                }}
                onSwipeOpen={(open) => setSwipeOpenId(open ? message.id : null)}
                onReply={() => beginReply(message)}
                onReact={() => void setReaction(message.id, reactions[message.id] === "❤️" ? "" : "❤️")}
                onUnsend={() => { setSelectedMessageId(message.id); setConfirmUnsendId(message.id); setSwipeOpenId(null); }}
              />

              {selectedMessageId === message.id && !message.deleted ? (
                <div className={cn("mt-2 max-w-[94%] rounded-[18px] border bg-surface p-2 shadow-lg", message.sender === "me" ? "ml-auto" : "mr-auto")}>
                  <div className="flex flex-wrap gap-1">
                    <MessageAction icon={Reply} label="Reply" onClick={() => beginReply(message)}/>
                    <MessageAction icon={Smile} label="React" onClick={() => { setEmojiFor((id) => id === message.id ? null : message.id); setMayaMenuFor(null); }}/>
                    {message.sender === "me" ? <MessageAction icon={Pencil} label="Edit" onClick={() => beginEdit(message)}/> : null}
                    <MessageAction icon={Copy} label="Copy" onClick={() => copyMessage(message.text)}/>
                    <MessageAction icon={Sparkles} label="Ask Maya" emphasis onClick={() => { setMayaMenuFor((id) => id === message.id ? null : message.id); setEmojiFor(null); }}/>
                    {message.sender === "me"
                      ? <MessageAction icon={Trash2} label="Unsend" danger onClick={() => setConfirmUnsendId(message.id)}/>
                      : <MessageAction icon={Flag} label="Report" danger onClick={() => safetyAction("Report")}/>
                    }
                  </div>

                  {emojiFor === message.id ? (
                    <div className="mt-2 flex items-center justify-between gap-1 border-t pt-2" role="group" aria-label="Choose a reaction">
                      {reactionOptions.map((option) => (
                        <button
                          type="button"
                          key={option.emoji}
                          onClick={() => void setReaction(message.id, option.emoji)}
                          aria-label={`React with ${option.label}`}
                          aria-pressed={reactions[message.id] === option.emoji}
                          className={cn("grid size-11 place-items-center rounded-full text-xl transition hover:bg-foreground/5 active:scale-90", reactions[message.id] === option.emoji && "bg-crimson/10 ring-2 ring-crimson/30")}
                        >
                          {option.emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {confirmUnsendId === message.id ? (
                    <div className="mt-2 flex items-center gap-2 border-t pt-2" role="alert">
                      <p className="min-w-0 flex-1 px-1 text-xs text-stone">Unsend this message for everyone?</p>
                      <button type="button" onClick={() => setConfirmUnsendId(null)} className="min-h-11 rounded-xl px-3 text-xs font-semibold">Cancel</button>
                      <button type="button" onClick={() => unsend(message)} disabled={pendingMessageId === message.id} className="min-h-11 rounded-xl bg-crimson px-3 text-xs font-semibold text-white disabled:opacity-50">Unsend</button>
                    </div>
                  ) : null}

                  {mayaMenuFor === message.id ? (
                    <div className="mt-2 grid gap-1 border-t pt-2">
                      <button type="button" onClick={() => askMaya(message, "conversation_coach", "explain_message")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold hover:bg-foreground/5">What does this mean?</button>
                      <button type="button" onClick={() => askMaya(message, "conversation_coach", "help_reply")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold hover:bg-foreground/5">Help me reply</button>
                      <button type="button" onClick={() => askMaya(message, "translation", "translate")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold hover:bg-foreground/5">Translate</button>
                      <button type="button" onClick={() => askMaya(message, "safety_check", "check_warning_signs")} className="min-h-11 rounded-xl px-3 text-left text-xs font-semibold text-crimson hover:bg-crimson/5">Check for warning signs</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={messageEndRef}/>
        </div>
      </div>

      <form onSubmit={send} className="shrink-0 border-t bg-surface px-3 pb-3 pt-2">
        {replyingTo || editingMessage ? (
          <div className="mb-2 flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2">
            <div className="min-w-0 flex-1 border-l-2 border-crimson pl-2">
              <p className="text-[10px] font-bold uppercase tracking-[.1em] text-crimson">{editingMessage ? "Editing message" : `Replying to ${replyingTo?.sender === "me" ? "yourself" : profile.firstName}`}</p>
              <p className="truncate text-xs text-stone">{editingMessage?.text ?? replyingTo?.text}</p>
            </div>
            <button
              type="button"
              onClick={() => { if (editingMessage) setDraft(""); setEditingMessage(null); setReplyingTo(null); }}
              className="grid size-11 shrink-0 place-items-center rounded-full"
              aria-label={editingMessage ? "Cancel editing" : "Cancel reply"}
            >
              <X size={17}/>
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => setNotice("Image attachment is coming soon.")} className="grid size-11 shrink-0 place-items-center rounded-full text-stone" aria-label="Attach image"><ImagePlus size={20}/></button>
          <label className="flex min-h-11 flex-1 items-center rounded-[20px] border bg-background px-4 py-2.5">
            <span className="sr-only">Message</span>
            <textarea
              ref={composerRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={editingMessage ? "Edit message…" : replyingTo ? "Write a reply…" : "Write a message…"}
              className="max-h-28 w-full resize-none bg-transparent text-sm leading-6 outline-none"
            />
          </label>
          <Button size="icon" aria-label={editingMessage ? "Save edited message" : "Send message"} disabled={!draft.trim() || Boolean(pendingMessageId)}>
            {editingMessage ? <Check size={18} /> : <Send size={18} />}
          </Button>
        </div>
      </form>
      <AnimatePresence>{profileOpen ? <ChatProfileSheet profile={profile} onClose={() => setProfileOpen(false)}/> : null}</AnimatePresence>
    </div>
  );
}

function ChatProfileSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className="fixed inset-0 z-[75] bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-profile-name"
      onClick={(event) => event.stopPropagation()}
      initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
      animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 34 }}
      className="fixed inset-x-0 bottom-0 mx-auto max-h-[86dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-background px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-2xl md:bottom-[max(24px,calc((100dvh-820px)/2))] md:max-h-[760px] md:rounded-[28px]"
    >
      <div className="mx-auto h-1.5 w-12 rounded-full bg-foreground/15"/>
      <div className="mt-4 flex items-start gap-4">
        <Portrait quadrant={profile.portrait} initials={profile.firstName} alt={`${profile.firstName}'s profile`} className="size-20 shrink-0 rounded-[24px]"/>
        <div className="min-w-0 flex-1 pt-1">
          <h2 id="chat-profile-name" className="truncate text-2xl font-semibold">{profile.firstName}{profile.age ? `, ${profile.age}` : ""} {profile.verified ? <span className="text-success">✓</span> : null}</h2>
          <p className="mt-1 text-sm text-stone">{profile.city}</p>
          <p className="mt-2 inline-flex rounded-full bg-crimson/10 px-3 py-1 text-xs font-semibold text-crimson">{profile.intent}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full border" aria-label="Close profile"><X size={18}/></button>
      </div>
      <p className="mt-6 text-sm leading-6 text-stone">{profile.bio}</p>
      {profile.occupation || profile.from ? <div className="mt-5 grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl border bg-surface p-3"><p className="text-stone">From</p><p className="mt-1 font-semibold">{profile.from || "Not shared"}</p></div><div className="rounded-2xl border bg-surface p-3"><p className="text-stone">Work / study</p><p className="mt-1 font-semibold">{profile.occupation || "Not shared"}</p></div></div> : null}
      {profile.interests.length ? <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-stone">Interests</p><div className="mt-2 flex flex-wrap gap-2">{profile.interests.map((interest) => <span key={interest} className="rounded-full border bg-surface px-3 py-2 text-xs font-medium">{interest}</span>)}</div></div> : null}
      {profile.languages.length ? <p className="mt-5 text-xs text-stone"><span className="font-semibold text-foreground">Languages:</span> {profile.languages.join(" · ")}</p> : null}
      <div className="mt-6 rounded-[22px] bg-[#fff1ed] p-4 dark:bg-[#24171b]"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-crimson">{profile.prompt}</p><p className="mt-2 text-sm leading-6">{profile.answer}</p></div>
      <Button onClick={onClose} className="mt-6 w-full">Back to chat</Button>
    </motion.section>
  </motion.div>;
}

type SwipeableMessageProps = {
  message: DemoMessage;
  profileName: string;
  reaction?: string;
  selected: boolean;
  swipeOpen: boolean;
  pending: boolean;
  onToggle: () => void;
  onSwipeOpen: (open: boolean) => void;
  onReply: () => void;
  onReact: () => void;
  onUnsend: () => void;
};

function SwipeableMessage({
  message,
  profileName,
  reaction,
  selected,
  swipeOpen,
  pending,
  onToggle,
  onSwipeOpen,
  onReply,
  onReact,
  onUnsend,
}: SwipeableMessageProps) {
  const reduceMotion = useReducedMotion();
  const ownMessage = message.sender === "me";

  return (
    <div className="relative overflow-hidden rounded-[24px]">
      {!message.deleted ? (
        <div className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-end">
          <button type="button" onClick={onReply} className="grid size-11 place-items-center text-stone" aria-label="Reply to message"><Reply size={17}/></button>
          <button
            type="button"
            onClick={ownMessage ? onUnsend : onReact}
            className={cn("grid size-11 place-items-center", ownMessage ? "text-crimson" : "text-stone")}
            aria-label={ownMessage ? "Unsend message" : "React with love"}
          >
            {ownMessage ? <Trash2 size={17}/> : <span aria-hidden="true" className="text-lg">❤️</span>}
          </button>
        </div>
      ) : null}
      <motion.div
        drag={message.deleted || pending ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -88, right: 0 }}
        dragElastic={0.04}
        animate={{ x: swipeOpen ? -88 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
        onDragEnd={(_, info) => onSwipeOpen(info.offset.x < -42)}
        className={cn("relative z-10 flex min-h-11 touch-pan-y bg-background", ownMessage ? "justify-end" : "justify-start")}
      >
        <div className={cn("relative max-w-[82%]", ownMessage ? "text-right" : "text-left")}>
          <button
            type="button"
            onClick={onToggle}
            disabled={message.deleted || pending}
            aria-label={`Message from ${ownMessage ? "you" : profileName}. ${message.deleted ? "Unsent." : "Open message actions."}`}
            aria-expanded={selected}
            className={cn(
              "w-full rounded-[20px] px-4 py-3 text-left disabled:opacity-75",
              ownMessage ? "rounded-br-md bg-ink text-ivory" : "rounded-bl-md bg-foreground/6",
              message.deleted && "italic",
            )}
          >
            {message.replyTo ? (
              <span className={cn("mb-2 block rounded-xl border-l-2 px-2.5 py-1.5 text-[11px] leading-4", ownMessage ? "border-crimson bg-white/8 text-ivory/70" : "border-crimson bg-background/70 text-stone")}>
                <span className="block font-semibold">{message.replyTo.sender === "me" ? "You" : profileName}</span>
                <span className="line-clamp-2">{message.replyTo.text}</span>
              </span>
            ) : null}
            <span className="block whitespace-pre-wrap break-words text-sm leading-6">{message.text}</span>
            <span className={cn("mt-1 flex items-center justify-end gap-1 text-[9px]", ownMessage ? "text-ivory/55" : "text-stone")}>
              {message.edited ? "edited · " : null}{message.timestamp}
              {message.expiresAt ? <Clock3 size={10} aria-label="Disappearing message"/> : null}
              {ownMessage && !message.deleted ? <CheckCheck size={12} aria-label={message.status ?? "sent"}/> : null}
            </span>
          </button>
          {reaction ? (
            <span className={cn("absolute -bottom-3 grid min-h-7 min-w-8 place-items-center rounded-full border bg-surface px-1.5 text-sm shadow-sm", ownMessage ? "left-2" : "right-2")} aria-label={`Reaction: ${reaction}`}>
              {reaction}
            </span>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

function formatReactionSummary(message: DemoMessage, mine?: string) {
  const emojis = message.reactions?.filter((reaction) => !reaction.mine).map((reaction) => reaction.emoji) ?? [];
  if (mine) emojis.push(mine);
  const unique = [...new Set(emojis)];
  return unique.length ? unique.join("") : undefined;
}

function MessageAction({
  icon: Icon,
  label,
  emphasis,
  danger,
  onClick,
}: {
  icon: typeof Reply;
  label: string;
  emphasis?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold",
        emphasis ? "bg-crimson/10 text-crimson" : danger ? "text-crimson hover:bg-crimson/5" : "text-stone hover:bg-foreground/5",
      )}
    >
      <Icon size={14}/>{label}
    </button>
  );
}
