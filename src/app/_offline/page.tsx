import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Wordmark } from "@/components/brand/brand-mark";

export default function OfflinePage() { return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center"><div><Wordmark/><div className="mx-auto mt-12 grid size-20 place-items-center rounded-[28px] bg-crimson/10 text-crimson"><WifiOff size={30}/></div><h1 className="mt-6 text-3xl font-semibold tracking-tight">You’re offline.</h1><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-stone">Bhetau will retry when your connection returns. Messages that were still sending may need a tap.</p><Link href="/discover" className="mt-7 inline-flex h-14 items-center justify-center rounded-2xl bg-ink px-7 font-semibold text-ivory">Try again</Link></div></main>; }
