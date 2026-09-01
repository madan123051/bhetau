"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Archive, ArrowUpRight, CheckCircle2, MessageCircle, RefreshCw, X } from "lucide-react";
import { Portrait } from "@/components/profile/portrait";
import type { PortraitQuadrant } from "@/types/domain";

export type ChatListItem = {
  id: string;
  profileId: string;
  firstName: string;
  city: string;
  verified: boolean;
  portrait?: PortraitQuadrant;
  thumbnailUrl?: string | null;
  lastMessage: string;
  timestamp: string;
  timestampIso: string | null;
  unread: number;
  matchedAt: string;
  hasMessages: boolean;
};

function Avatar({ item, size = "large" }: { item: ChatListItem; size?: "small" | "large" }) {
  return (
    <Portrait
      src={item.thumbnailUrl}
      quadrant={item.portrait}
      initials={item.firstName}
      alt={item.portrait ? `Fictional portrait of ${item.firstName}` : `${item.firstName}'s profile placeholder`}
      className={size === "large" ? "size-14 shrink-0 rounded-full text-xl" : "size-15 rounded-full text-xl"}
    />
  );
}

export function ChatsList({
  initialItems,
  demoMode = false,
  loadError,
}: {
  initialItems: ChatListItem[];
  demoMode?: boolean;
  loadError?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("");
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [removeCandidate, setRemoveCandidate] = useState<ChatListItem | null>(null);
  const reducedMotion = useReducedMotion();
  const recentMatches = [...items]
    .sort((a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime())
    .slice(0, 5);

  const archive = async (conversationId: string) => {
    if (pending.has(conversationId)) return;
    const index = items.findIndex((item) => item.id === conversationId);
    const item = items[index];
    if (!item) return;

    setPending((current) => new Set(current).add(conversationId));
    setItems((current) => current.filter((entry) => entry.id !== conversationId));
    setRevealedId(null);
    setRemoveCandidate(null);
    setStatus("Chat hidden. Your match and messages are still safe.");

    const result = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", conversationId }),
    }).then(async (response) => ({
      ok: response.ok,
      error: response.ok ? null : (await response.json().catch(() => null))?.error,
    })).catch(() => ({ ok: false, error: null }));

    setPending((current) => {
      const next = new Set(current);
      next.delete(conversationId);
      return next;
    });

    if (!result.ok) {
      setItems((current) => {
        const restored = [...current];
        restored.splice(Math.min(index, restored.length), 0, item);
        return restored;
      });
      setStatus(result.error ?? "Couldn’t remove that conversation. Please retry.");
    }

    window.setTimeout(() => setStatus(""), 2800);
  };

  return (
    <main className="pb-6 pt-[max(26px,env(safe-area-inset-top))]">
      <header className="px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[.14em] text-crimson">CONVERSATIONS</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Chats</h1>
          </div>
          {demoMode && <span className="rounded-full bg-crimson/10 px-3 py-1.5 text-[10px] font-bold tracking-[.12em] text-crimson">DEMO</span>}
        </div>
        <p className="mt-2 text-sm text-stone">The good part starts after the match.</p>
      </header>

      {loadError ? (
        <section role="alert" className="mx-5 mt-8 rounded-[26px] border bg-surface p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-crimson/10 text-crimson"><RefreshCw size={20}/></div>
          <h2 className="mt-4 text-lg font-semibold">Chats need another try</h2>
          <p className="mt-2 text-sm leading-6 text-stone">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-2xl bg-foreground px-5 text-sm font-semibold text-background">Retry</button>
        </section>
      ) : (
        <>
          {recentMatches.length > 0 && (
            <section className="mt-7">
              <div className="flex items-center justify-between px-5">
                <h2 className="text-sm font-semibold">Your matches</h2>
                <span className="text-xs text-stone">Say hello</span>
              </div>
              <div className="hide-scrollbar mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
                {recentMatches.map((item) => (
                  <Link key={item.id} href={`/chats/${item.id}`} className="w-16 shrink-0 text-center" aria-label={`Open chat with ${item.firstName}`}>
                    <div className="relative">
                      <Avatar item={item} size="small"/>
                      {item.unread > 0 && <span className="absolute bottom-0 right-0 size-4 rounded-full border-[3px] border-background bg-crimson"><span className="sr-only">New message</span></span>}
                    </div>
                    <span className="mt-2 block truncate text-xs font-medium">{item.firstName}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section className="mt-7 px-3">
              <div className="flex items-end justify-between px-2">
                <h2 className="text-sm font-semibold">Messages</h2>
                <span className="text-[11px] text-stone">Swipe left for options</span>
              </div>
              <div className="mt-2 space-y-1 overflow-hidden">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -100, height: 0 }}
                      className="relative overflow-hidden rounded-2xl"
                    >
                      <button
                        type="button"
                        onClick={() => setRemoveCandidate(item)}
                        disabled={pending.has(item.id)}
                        aria-label={`Review removal of conversation with ${item.firstName}`}
                        className="absolute inset-y-0 right-0 z-0 flex w-24 flex-col items-center justify-center gap-1 bg-wine text-[11px] font-semibold text-white disabled:opacity-60 focus-visible:z-20"
                      >
                        <Archive size={19}/>
                        Hide
                      </button>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -96, right: 0 }}
                        dragElastic={0.08}
                        dragMomentum={false}
                        animate={{ x: revealedId === item.id ? -96 : 0 }}
                        onDragEnd={(_, info) => {
                          setRevealedId(info.offset.x < -48 || info.velocity.x < -450 ? item.id : null);
                        }}
                        className="relative z-10 touch-pan-y bg-background"
                      >
                        <Link href={`/chats/${item.id}`} className="flex min-h-[86px] items-center gap-3 rounded-2xl px-2 transition hover:bg-foreground/4" aria-label={`Open chat with ${item.firstName}`}>
                          <Avatar item={item}/>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold">{item.firstName}{item.verified && <CheckCircle2 aria-label="Verified" size={14} className="ml-1 inline text-success"/>}</p>
                              <time dateTime={item.timestampIso ?? undefined} className="shrink-0 text-[11px] text-stone">{item.timestamp}</time>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-stone">{item.city}</p>
                            <p className={`mt-1 truncate text-sm ${item.unread ? "font-medium text-foreground" : "text-stone"}`}>{item.lastMessage}</p>
                          </div>
                          {item.unread ? (
                            <span aria-label={`${item.unread} unread messages`} className="grid min-w-6 place-items-center rounded-full bg-crimson px-1.5 py-1 text-[11px] font-bold text-white">{item.unread > 99 ? "99+" : item.unread}</span>
                          ) : <ArrowUpRight aria-hidden="true" size={16} className="shrink-0 text-stone"/>}
                        </Link>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {items.length === 0 && (
            <section className="mx-5 mt-12 rounded-[28px] border bg-surface p-8 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-crimson/10 text-crimson"><MessageCircle size={26}/></div>
              <h2 className="mt-5 text-xl font-semibold">Your next conversation hasn’t started yet.</h2>
              <p className="mt-2 text-sm leading-6 text-stone">When a like becomes mutual, the match and conversation will appear here automatically.</p>
              <Link href="/discover" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5a72] to-[#d72c55] px-5 text-sm font-semibold text-white">Keep exploring</Link>
            </section>
          )}
        </>
      )}

      <AnimatePresence>
        {removeCandidate ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 px-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-sm md:absolute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRemoveCandidate(null)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="hide-chat-title"
              initial={reducedMotion ? { opacity: 0 } : { y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { y: 32, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[404px] rounded-[28px] border bg-surface p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-crimson/10 text-crimson"><Archive size={19}/></div>
                <div className="min-w-0 flex-1">
                  <h2 id="hide-chat-title" className="text-lg font-semibold">Hide chat with {removeCandidate.firstName}?</h2>
                  <p className="mt-1 text-sm leading-6 text-stone">This only removes the conversation from your Chats list. You stay matched, and existing messages remain saved.</p>
                </div>
                <button type="button" onClick={() => setRemoveCandidate(null)} className="grid size-11 shrink-0 place-items-center rounded-full" aria-label="Cancel hiding chat"><X size={18}/></button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRemoveCandidate(null)} className="min-h-12 rounded-2xl border text-sm font-semibold">Keep chat</button>
                <button type="button" onClick={() => void archive(removeCandidate.id)} disabled={pending.has(removeCandidate.id)} className="min-h-12 rounded-2xl bg-crimson text-sm font-semibold text-white disabled:opacity-50">Hide chat</button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
        {status && (
          <motion.div role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-xl md:absolute">
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
