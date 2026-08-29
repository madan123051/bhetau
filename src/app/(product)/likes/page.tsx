import { LockKeyhole, Sparkles } from "lucide-react";
import { Portrait } from "@/components/profile/portrait";
import { Button } from "@/components/ui/button";
import { profiles } from "@/data/profiles";

export default function LikesPage() {
  return <main className="px-5 pb-6 pt-[max(26px,env(safe-area-inset-top))]"><p className="text-xs font-bold tracking-[.14em] text-crimson">PEOPLE WHO NOTICED YOU</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Likes You</h1><p className="mt-2 text-sm leading-6 text-stone">A quieter way to see who’s interested.</p>
    <section className="relative mt-7 overflow-hidden rounded-[28px] bg-[#28131a] p-6 text-white"><div className="absolute -right-9 -top-9 size-36 rounded-full bg-crimson/25 blur-2xl"/><LockKeyhole size={23} className="text-[#ff9aac]"/><h2 className="mt-4 text-2xl font-semibold">You have 7 thoughtful likes.</h2><p className="mt-2 max-w-xs text-sm leading-6 text-white/62">Premium preview is shown gently—no countdowns, pressure, or surprise charges.</p><Button className="mt-5" size="sm">See membership options</Button></section>
    <div className="mt-5 grid grid-cols-2 gap-3">{profiles.slice(0,6).map((profile, index) => <article key={profile.id} className="relative overflow-hidden rounded-[22px] bg-raised"><Portrait quadrant={profile.portrait} alt="Blurred preview of someone who liked you" className="aspect-[4/5] scale-105 blur-[10px]"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-3 text-white"><span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold backdrop-blur"><Sparkles size={11}/>{88 - index * 3}% vibe</span><p className="mt-2 text-sm font-semibold">{profile.city}</p></div></article>)}</div>
  </main>;
}
