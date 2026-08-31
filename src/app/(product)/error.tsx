"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/brand-mark";

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[calc(100dvh-96px)] place-items-center px-6 text-center">
      <div>
        <Wordmark />
        <p className="mt-10 text-xs font-bold tracking-[.14em] text-crimson">TEMPORARY PAUSE</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">This page needs another moment.</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-stone">Your account is safe. Retry the page or return to Discover.</p>
        <Button onClick={reset} className="mt-7 w-full"><RefreshCw size={17}/>Retry</Button>
        <Link href="/discover" className="mt-3 inline-flex min-h-12 items-center justify-center px-5 text-sm font-semibold text-crimson">Back to Discover</Link>
      </div>
    </main>
  );
}
