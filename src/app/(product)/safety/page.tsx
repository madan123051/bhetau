import Link from "next/link";
import { ArrowRight, CameraOff, Flag, Hand, MapPinned, ShieldCheck, UserRoundX } from "lucide-react";

const cards = [
  { icon: Hand, title: "Trust the pause", text: "You never owe a reply, a date, or an explanation. Unmatch or block at any time." },
  { icon: MapPinned, title: "Meet in public", text: "Choose a familiar, busy venue and tell someone you trust where you’re going." },
  { icon: CameraOff, title: "Screenshots exist", text: "Avoid sharing anything you would not want saved. Screenshot prevention is not guaranteed on the web." },
  { icon: Flag, title: "Report early", text: "Fake profiles, under-18 users, harassment, scams, hate, and impersonation are reportable." },
];

export default function SafetyPage() { return <main className="px-5 pb-8 pt-[max(26px,env(safe-area-inset-top))]"><div className="grid size-14 place-items-center rounded-[20px] bg-success/12 text-success"><ShieldCheck size={26}/></div><p className="mt-6 text-xs font-bold tracking-[.14em] text-success">SAFETY CENTER</p><h1 className="mt-2 text-balance text-4xl font-semibold leading-tight tracking-[-.05em]">Meet with a plan, not pressure.</h1><p className="mt-3 text-sm leading-6 text-stone">Controls are easy to reach before, during, and after a conversation.</p>
  <Link href="/share-date" className="mt-7 flex items-center gap-4 rounded-[24px] bg-[#1d1619] p-5 text-white"><div className="grid size-12 place-items-center rounded-2xl bg-[#e83c5b]"><MapPinned/></div><div className="min-w-0 flex-1"><p className="font-semibold">Share Date</p><p className="mt-1 text-xs leading-5 text-white/60">Create a private plan for a trusted contact.</p></div><ArrowRight/></Link>
  <div className="mt-5 grid gap-3">{cards.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[22px] border bg-surface p-5"><Icon size={21} className="text-crimson"/><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-stone">{text}</p></article>)}</div>
  <section className="mt-6 rounded-[22px] border border-crimson/20 bg-crimson/5 p-5"><UserRoundX className="text-crimson"/><h2 className="mt-3 font-semibold">Immediate danger?</h2><p className="mt-2 text-sm leading-6 text-stone">Contact local emergency services or someone you trust. Bhetau is not an emergency service.</p></section>
  </main>; }
