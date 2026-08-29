"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, LockKeyhole, MessageSquareText, UserRoundSearch } from "lucide-react";
import { BrandMark, Wordmark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

const slides = [
  { icon: UserRoundSearch, eyebrow: "01 · PERSON FIRST", title: "Meet people, not profiles.", copy: "Start with the things they care about—not just the best photo they found.", accent: "bg-[#ffd7de] dark:bg-[#39161f]" },
  { icon: MessageSquareText, eyebrow: "02 · WITH INTENT", title: "More than a swipe.", copy: "See what they’re looking for, what you share, and why a conversation might work.", accent: "bg-[#eadcf6] dark:bg-[#281d31]" },
  { icon: LockKeyhole, eyebrow: "03 · BUILT WITH CARE", title: "Safety comes first.", copy: "Approximate locations, privacy controls, reporting, and a plan for the first date.", accent: "bg-[#dff2e8] dark:bg-[#132a21]" },
];

export function WelcomeFlow() {
  const [splash, setSplash] = useState(true);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => { const id = window.setTimeout(() => setSplash(false), reduced ? 120 : 1000); return () => window.clearTimeout(id); }, [reduced]);

  if (splash) return <div className="grid min-h-dvh place-items-center bg-background"><motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center"><motion.p initial={reduced ? false : { opacity: 1 }} animate={{ opacity: [1, .15, 0] }} transition={{ delay: .35, duration: .45 }} className="absolute left-1/2 -translate-x-1/2 font-devanagari text-5xl font-semibold text-crimson">भेटौँ</motion.p><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .62 }}><Wordmark /></motion.div></motion.div></div>;

  const slide = slides[index];
  const Icon = slide.icon;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col overflow-hidden bg-background px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between"><Wordmark compact/><button className="min-h-11 px-2 text-sm font-medium text-stone" onClick={() => setIndex(2)}>Skip</button></div>
      <div className="flex flex-1 flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          <motion.section key={index} initial={reduced ? false : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: -20 }} transition={{ duration: .32 }}>
            <div className={`relative grid aspect-[1.08] place-items-center overflow-hidden rounded-[32px] ${slide.accent}`}>
              <div className="absolute left-8 top-8 size-32 rounded-full border border-foreground/10"/><div className="absolute bottom-8 right-6 size-44 rounded-full border border-foreground/10"/>
              <div className="relative grid size-28 place-items-center rounded-[36px] bg-surface shadow-xl"><Icon size={46} strokeWidth={1.5} className="text-crimson"/><BrandMark className="absolute -bottom-3 -right-3 scale-75"/></div>
            </div>
            <p className="mt-8 text-xs font-bold tracking-[.16em] text-crimson">{slide.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.03] tracking-[-.05em]">{slide.title}</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-stone">{slide.copy}</p>
          </motion.section>
        </AnimatePresence>
      </div>
      <div className="mb-5 flex gap-2" aria-label={`Slide ${index + 1} of ${slides.length}`}>{slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-9 bg-crimson" : "w-2 bg-foreground/15"}`}/>)}</div>
      {index < 2 ? <Button className="w-full" onClick={() => setIndex(index + 1)}>Continue <ArrowRight size={18}/></Button> : <div className="space-y-3"><Link href="/auth" className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5a72] to-[#d72c55] font-semibold text-white">Create account</Link><Link href="/auth?mode=signin" className="flex h-14 w-full items-center justify-center rounded-2xl border bg-surface font-semibold">I already have an account</Link></div>}
    </main>
  );
}
