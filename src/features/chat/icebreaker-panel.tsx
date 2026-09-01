"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, MessageSquareQuote, RefreshCw } from "lucide-react";
import { useId, useState } from "react";

const defaultSuggestions = [
  "You both selected trekking — ask which trail they’d repeat.",
  "You both like coffee — ask for their most overrated café take.",
] as const;

export function IcebreakerPanel({
  suggestions = defaultSuggestions,
  onUse,
}: {
  suggestions?: readonly string[];
  onUse: (suggestion: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(suggestions[0] ?? "Ask what made them smile this week.");
  const panelId = useId();
  const reducedMotion = useReducedMotion();

  const nextSuggestion = () => {
    if (!suggestions.length) return;
    const nextIndex = (index + 1) % suggestions.length;
    setIndex(nextIndex);
    setDraft(suggestions[nextIndex]);
  };

  const useSuggestion = () => {
    const suggestion = draft.replace(/^You both.*?—\s*/, "").trim();
    if (!suggestion) return;
    onUse(suggestion);
    setOpen(false);
  };

  return (
    <section className="border-b bg-[#fff4f1] dark:bg-[#21171a]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[13px] bg-crimson/10 text-crimson"><MessageSquareQuote size={17}/></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-crimson">Editable icebreaker</span>
          <span className="mt-0.5 block truncate text-xs text-stone">{draft}</span>
        </span>
        <ChevronDown size={17} className={`shrink-0 text-stone transition-transform duration-150 ${open ? "rotate-180" : ""}`}/>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-crimson/10 px-4 pb-4 pt-3">
              <label htmlFor={`${panelId}-input`} className="sr-only">Edit icebreaker</label>
              <textarea
                id={`${panelId}-input`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                maxLength={280}
                className="w-full resize-none rounded-2xl border border-crimson/15 bg-surface px-3 py-2.5 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-crimson"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <button type="button" onClick={nextSuggestion} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-stone"><RefreshCw size={14}/>New idea</button>
                <button type="button" onClick={useSuggestion} disabled={!draft.trim()} className="min-h-11 rounded-xl bg-crimson px-4 text-xs font-semibold text-white disabled:opacity-50">Use in message</button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
