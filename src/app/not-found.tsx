import Link from "next/link";
import { Wordmark } from "@/components/brand/brand-mark";

export default function NotFound() { return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center"><div><Wordmark/><p className="mt-12 text-xs font-bold tracking-[.14em] text-crimson">404</p><h1 className="mt-3 text-3xl font-semibold">This meeting point moved.</h1><Link href="/" className="mt-7 inline-flex h-14 items-center rounded-2xl bg-ink px-7 font-semibold text-ivory">Back to bhetau</Link></div></main>; }
