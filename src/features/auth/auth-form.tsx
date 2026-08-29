"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, ArrowLeft, CheckCircle2, Mail, Phone } from "lucide-react";
import { Wordmark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const continueFlow = async () => {
    setError("");
    if (!ageConfirmed) return setError("Confirm that you are 18 or older.");
    if (!value.trim()) return setError(method === "phone" ? "Enter a Nepal phone number." : "Enter your email address.");
    if (!hasSupabaseEnv) { setOtpSent(true); return; }
    setBusy(true);
    const client = getSupabaseBrowserClient();
    const payload = method === "phone" ? { phone: value.startsWith("+") ? value : `+977${value.replace(/^0/, "")}` } : { email: value };
    const { error: authError } = await client!.auth.signInWithOtp(payload);
    setBusy(false);
    if (authError) setError(authError.message); else setOtpSent(true);
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    if (!hasSupabaseEnv) { router.push("/setup"); return; }
    setBusy(true);
    const client = getSupabaseBrowserClient()!;
    const tokenType = method === "phone" ? "sms" : "email";
    const payload = method === "phone" ? { phone: value.startsWith("+") ? value : `+977${value.replace(/^0/, "")}`, token: otp, type: tokenType as "sms" } : { email: value, token: otp, type: tokenType as "email" };
    const { error: verifyError } = await client.auth.verifyOtp(payload);
    setBusy(false);
    if (verifyError) setError(verifyError.message); else router.push("/setup");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-background px-5 pb-8 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between"><button onClick={() => router.back()} className="grid size-11 place-items-center rounded-full border" aria-label="Go back"><ArrowLeft size={19}/></button><Wordmark compact/><span className="size-11"/></div>
      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="font-devanagari text-sm font-semibold text-crimson">सुरक्षित रूपमा सुरु गरौँ</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.05em]">{otpSent ? "Check your messages." : "A real hello starts here."}</h1>
        <p className="mt-3 leading-7 text-stone">{otpSent ? `We sent a six-digit code to ${value}.` : "Use your Nepal phone number, or continue with email."}</p>

        {!hasSupabaseEnv && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#f0c56c]/50 bg-[#fff8e8] p-4 text-sm text-[#6c4b0b] dark:bg-[#2a2111] dark:text-[#f5d78f]"><CheckCircle2 className="mt-0.5 shrink-0" size={18}/><span><b>Demo mode is on.</b> Use any contact and enter any six digits.</span></div>}

        {!otpSent ? <>
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-foreground/5 p-1"><button onClick={() => setMethod("phone")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${method === "phone" ? "bg-surface shadow-sm" : "text-stone"}`}><Phone size={17}/> Phone</button><button onClick={() => setMethod("email")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${method === "email" ? "bg-surface shadow-sm" : "text-stone"}`}><Mail size={17}/> Email</button></div>
          <label className="mt-5 text-sm font-semibold" htmlFor="auth-value">{method === "phone" ? "Phone number" : "Email address"}</label>
          <div className="mt-2 flex h-14 items-center rounded-2xl border bg-surface px-4 focus-within:ring-2 focus-within:ring-crimson/25">{method === "phone" && <span className="mr-3 border-r pr-3 text-sm font-medium">+977</span>}<input id="auth-value" className="min-w-0 flex-1 bg-transparent outline-none" type={method === "phone" ? "tel" : "email"} inputMode={method === "phone" ? "numeric" : "email"} placeholder={method === "phone" ? "98XXXXXXXX" : "you@example.com"} value={value} onChange={(e) => setValue(e.target.value)}/></div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-[#e83c5b]" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)}/><span><b>I am 18 or older.</b><br/><span className="text-stone">Bhetau is strictly for adults.</span></span></label>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-crimson">{error}</p>}
          <Button onClick={continueFlow} disabled={busy} className="mt-6 w-full">{busy ? "Sending…" : "Send one-time code"}</Button>
          <div className="my-6 flex items-center gap-3 text-xs text-stone"><span className="h-px flex-1 bg-line"/>or continue with<span className="h-px flex-1 bg-line"/></div>
          <div className="grid grid-cols-2 gap-3"><Button variant="secondary" size="sm" disabled>G&nbsp; Google</Button><Button variant="secondary" size="sm" disabled><Apple size={17}/> Apple</Button></div>
        </> : <>
          <label className="mt-7 text-sm font-semibold" htmlFor="otp">One-time code</label><input id="otp" aria-describedby="otp-help" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="mt-2 h-16 rounded-2xl border bg-surface px-4 text-center font-mono text-3xl tracking-[.35em] outline-none focus:ring-2 focus:ring-crimson/25" placeholder="000000"/><p id="otp-help" className="mt-3 text-sm text-stone">Code expires in 10 minutes. Demo mode accepts any six digits.</p>{error && <p role="alert" className="mt-3 text-sm font-medium text-crimson">{error}</p>}<Button onClick={verify} disabled={busy} className="mt-6 w-full">{busy ? "Checking…" : "Verify & continue"}</Button><button className="mt-4 min-h-11 text-sm font-semibold text-stone" onClick={() => setOtpSent(false)}>Change {method}</button>
        </>}
      </div>
      <p className="text-center text-xs leading-5 text-stone">By continuing, you agree to our Terms and acknowledge our Privacy and Safety policies.</p>
    </main>
  );
}
