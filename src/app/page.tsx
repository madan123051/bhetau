import Link from "next/link";
import { ArrowRight, Check, Coffee, LockKeyhole, MessageCircle, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/brand-mark";
import { Portrait } from "@/components/profile/portrait";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const features = [
  { icon: Sparkles, title: "Personality, not a catalogue", text: "Intent, prompts, and shared interests lead every introduction." },
  { icon: Check, title: "Shared vibes, explained", text: "Clear reasons—never a mysterious compatibility claim." },
  { icon: MessageCircle, title: "A better first message", text: "Thoughtful, editable icebreakers when words feel hard." },
  { icon: LockKeyhole, title: "Privacy before proximity", text: "Approximate areas, strong controls, and safety built in." },
];

export default function Home() {
  return (
    <main className="paper-noise min-h-dvh overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/auth" className="hidden min-h-11 items-center rounded-2xl px-4 text-sm font-semibold sm:inline-flex">Sign in</Link>
          <Link href="/welcome" className="inline-flex min-h-11 items-center rounded-2xl bg-ink px-5 text-sm font-semibold text-ivory transition hover:-translate-y-0.5">Join Bhetau</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-12 sm:px-8 md:min-h-[760px] md:grid-cols-[1fr_.9fr] md:py-20 lg:px-12">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-2 text-xs font-semibold uppercase tracking-[.14em] text-wine backdrop-blur">
            <span className="size-2 rounded-full bg-success" /> Made for Nepal, made with care
          </p>
          <h1 className="text-balance text-[clamp(3.35rem,8vw,7.2rem)] font-semibold leading-[.88] tracking-[-.075em]">
            Meet someone <span className="font-devanagari text-crimson">worth</span> meeting.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone sm:text-xl">Made for connections that feel real. Less swiping, more reasons to say hello.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/welcome" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#ff5a72] to-[#d72c55] px-7 font-semibold text-white shadow-[0_16px_36px_rgba(216,44,85,.25)] transition hover:-translate-y-0.5">Join Bhetau <ArrowRight size={18} /></Link>
            <a href="#how-it-works" className="inline-flex h-14 items-center justify-center rounded-2xl border bg-surface/70 px-7 font-semibold backdrop-blur transition hover:bg-surface">How it works</a>
          </div>
          <p className="mt-5 text-xs text-stone">18+ only · Your exact location is never shown</p>
        </div>

        <div className="relative mx-auto h-[620px] w-full max-w-[520px]" aria-label="Bhetau app preview">
          <div className="absolute left-0 top-16 z-10 w-[255px] -rotate-6 rounded-[38px] border-[7px] border-[#211e21] bg-background p-2 shadow-2xl sm:w-[280px]">
            <div className="relative overflow-hidden rounded-[29px] bg-background">
              <div className="flex items-center justify-between px-4 py-4"><Wordmark compact /><span className="rounded-full bg-crimson/10 px-2 py-1 text-[10px] font-bold text-crimson">Kathmandu</span></div>
              <div className="relative mx-2 overflow-hidden rounded-[24px]">
                <Portrait quadrant="tl" alt="Fictional profile preview" className="aspect-[4/5]" priority />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-20 text-white">
                  <span className="rounded-full bg-white/18 px-2 py-1 text-[10px] font-semibold backdrop-blur">92% vibe</span>
                  <h2 className="mt-2 text-2xl font-semibold">Aashika, 24 <span className="text-[#64d99d]">✓</span></h2>
                  <p className="text-xs text-white/75">Photography · Coffee · Trekking</p>
                </div>
              </div>
              <div className="m-3 rounded-2xl bg-raised p-3 text-xs leading-5"><b>My ideal weekend</b><br/><span className="text-stone">Somewhere outside Kathmandu with no notifications.</span></div>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-[245px] rotate-6 rounded-[38px] border-[7px] border-[#211e21] bg-[#171518] p-2 shadow-2xl sm:w-[270px]">
            <div className="min-h-[520px] overflow-hidden rounded-[29px] bg-[#171518] p-5 text-white">
              <div className="mt-8 flex items-center justify-center">
                <div className="-mr-4 size-20 overflow-hidden rounded-full border-4 border-[#171518]"><Portrait quadrant="tl" alt="Fictional profile" className="size-full" /></div>
                <div className="size-20 overflow-hidden rounded-full border-4 border-[#171518]"><Portrait quadrant="tr" alt="Fictional match" className="size-full" /></div>
              </div>
              <p className="mt-8 text-center font-devanagari text-sm text-[#ff9aac]">भेटौँ</p>
              <h2 className="mt-1 text-center text-3xl font-semibold tracking-tight">It’s a Bhetau!</h2>
              <p className="mx-auto mt-3 max-w-[190px] text-center text-sm leading-6 text-white/60">You both think the achar makes the momo.</p>
              <div className="mt-8 rounded-2xl bg-white/6 p-4"><Coffee size={18} className="text-[#ff7188]"/><p className="mt-3 text-sm font-medium">Try an icebreaker</p><p className="mt-1 text-xs leading-5 text-white/55">Ask for their most overrated café take.</p></div>
              <div className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-[#e83c5b] text-sm font-semibold">Say hi</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y bg-surface/55 py-20 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[.75fr_1.25fr]">
            <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-crimson">Less swiping</p><h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.045em]">Better reasons<br/>to meet.</h2></div>
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, text }) => <article key={title}><Icon className="text-crimson" size={24}/><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone">{text}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 text-center"><p className="font-devanagari text-crimson">भेटौँ</p><h2 className="mx-auto mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Your next good conversation can start quietly.</h2><Link href="/welcome" className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-ink px-8 font-semibold text-ivory">Create your profile</Link></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t px-5 py-8 text-sm text-stone sm:flex-row sm:items-center sm:justify-between sm:px-8"><Wordmark compact/><div className="flex flex-wrap gap-5"><Link href="/you">Privacy</Link><Link href="/safety">Safety</Link><a href="#">Terms</a><a href="mailto:hello@bhetau.example">Contact</a></div></footer>
    </main>
  );
}
