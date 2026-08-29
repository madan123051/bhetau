"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center"><div><div className="mx-auto grid size-20 place-items-center rounded-[28px] bg-crimson/10 text-crimson"><AlertCircle size={30}/></div><h1 className="mt-6 text-3xl font-semibold tracking-tight">Something interrupted the moment.</h1><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-stone">Your last choice is safe. Try loading this screen again.</p><Button onClick={reset} className="mt-7">Try again</Button></div></main>; }
