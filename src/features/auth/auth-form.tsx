"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, ArrowLeft, CheckCircle2, Mail, Phone, RotateCcw } from "lucide-react";
import { Wordmark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AuthMethod = "phone" | "email";
const phoneAuthEnabled = !hasSupabaseEnv || process.env.NEXT_PUBLIC_SUPABASE_PHONE_AUTH_ENABLED === "true";

function normalizeNepalPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("977")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return { local: digits, international: `+977${digits}` };
}

export function AuthForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>(phoneAuthEnabled ? "phone" : "email");
  const [value, setValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = async () => {
    setError("");
    if (!ageConfirmed) return setError("Confirm that you are 18 or older.");
    if (!hasSupabaseEnv) return setError("Google sign-in is available after Supabase is configured.");

    setBusy(true);
    const result = await getSupabaseBrowserClient()!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=/setup` },
    });
    if (result.error) {
      setBusy(false);
      setError(result.error.message);
    }
  };

  const changeMethod = (nextMethod: AuthMethod) => {
    setMethod(nextMethod);
    setValue("");
    setOtp("");
    setOtpSent(false);
    setError("");
  };

  const continueFlow = async () => {
    setError("");
    if (!ageConfirmed) return setError("Confirm that you are 18 or older.");

    const phone = normalizeNepalPhone(value);
    if (method === "phone" && !/^(96|97|98)\d{8}$/.test(phone.local)) {
      return setError("Enter a valid 10-digit Nepal mobile number.");
    }
    if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return setError("Enter a valid email address.");
    }
    if (!hasSupabaseEnv) {
      setOtpSent(true);
      return;
    }

    setBusy(true);
    const client = getSupabaseBrowserClient()!;
    const result = method === "phone"
      ? await client.auth.signInWithOtp({ phone: phone.international })
      : await client.auth.signInWithOtp({
          email: value.trim().toLowerCase(),
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/setup` },
        });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else setOtpSent(true);
  };

  const verify = async () => {
    setError("");
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    if (!hasSupabaseEnv) {
      router.push("/setup");
      return;
    }

    setBusy(true);
    const client = getSupabaseBrowserClient()!;
    const phone = normalizeNepalPhone(value);
    const result = method === "phone"
      ? await client.auth.verifyOtp({ phone: phone.international, token: otp, type: "sms" })
      : await client.auth.verifyOtp({ email: value.trim().toLowerCase(), token: otp, type: "email" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.replace("/setup");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-background px-5 pb-8 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="grid size-11 place-items-center rounded-full border" aria-label="Go back"><ArrowLeft size={19}/></button>
        <Wordmark compact/>
        <span className="size-11"/>
      </div>
      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="font-devanagari text-sm font-semibold text-crimson">सुरक्षित रूपमा सुरु गरौँ</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.05em]">{otpSent ? "Check your messages." : "A real hello starts here."}</h1>
        <p className="mt-3 leading-7 text-stone">{otpSent ? `We sent sign-in instructions to ${method === "phone" ? `+977 ${normalizeNepalPhone(value).local}` : value.trim()}.` : phoneAuthEnabled ? "Create your account or sign in with a Nepal phone number or email." : "Create your account or sign in securely with email."}</p>

        {!hasSupabaseEnv && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#f0c56c]/50 bg-[#fff8e8] p-4 text-sm text-[#6c4b0b] dark:bg-[#2a2111] dark:text-[#f5d78f]"><CheckCircle2 className="mt-0.5 shrink-0" size={18}/><span><b>Demo mode is on.</b> Use a valid-looking contact and enter any six digits.</span></div>}

        {!otpSent ? <>
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-foreground/5 p-1">
            <button type="button" disabled={!phoneAuthEnabled} aria-label={phoneAuthEnabled ? "Sign in with phone" : "Phone sign-in requires SMS provider setup"} onClick={() => changeMethod("phone")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${method === "phone" ? "bg-surface shadow-sm" : "text-stone"}`}><Phone size={17}/> Phone</button>
            <button type="button" onClick={() => changeMethod("email")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${method === "email" ? "bg-surface shadow-sm" : "text-stone"}`}><Mail size={17}/> Email</button>
          </div>
          <label className="mt-5 text-sm font-semibold" htmlFor="auth-value">{method === "phone" ? "Nepal mobile number" : "Email address"}</label>
          <div className="mt-2 flex h-14 items-center rounded-2xl border bg-surface px-4 focus-within:ring-2 focus-within:ring-crimson/25">{method === "phone" && <span className="mr-3 border-r pr-3 text-sm font-medium">+977</span>}<input id="auth-value" aria-describedby="contact-help" autoComplete={method === "phone" ? "tel-national" : "email"} className="min-w-0 flex-1 bg-transparent outline-none" type={method === "phone" ? "tel" : "email"} inputMode={method === "phone" ? "numeric" : "email"} placeholder={method === "phone" ? "98XXXXXXXX" : "you@example.com"} value={value} onChange={(event) => setValue(event.target.value)}/></div>
          <p id="contact-help" className="mt-2 text-xs leading-5 text-stone">{method === "phone" ? "SMS delivery uses the configured Supabase phone provider." : phoneAuthEnabled ? "You may receive a six-digit code or a secure sign-in link." : "Email is active now. Nepal phone login unlocks after the SMS provider is connected."}</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-[#e83c5b]" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)}/><span><b>I am 18 or older.</b><br/><span className="text-stone">Your date of birth is verified during profile setup.</span></span></label>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-crimson">{error}</p>}
          <Button onClick={continueFlow} disabled={busy} className="mt-6 w-full">{busy ? "Sending…" : "Continue securely"}</Button>
          <div className="my-6 flex items-center gap-3 text-xs text-stone"><span className="h-px flex-1 bg-line"/>optional providers<span className="h-px flex-1 bg-line"/></div>
          <div className="grid grid-cols-2 gap-3"><Button variant="secondary" size="sm" disabled={busy || !hasSupabaseEnv} onClick={signInWithGoogle} aria-label={hasSupabaseEnv ? "Continue with Google" : "Google sign-in requires Supabase setup"}><span aria-hidden className="font-semibold">G</span> Google</Button><Button variant="secondary" size="sm" disabled aria-label="Apple sign-in is not configured"><Apple size={17}/> Apple</Button></div>
        </> : <>
          <label className="mt-7 text-sm font-semibold" htmlFor="otp">One-time code</label>
          <input id="otp" aria-describedby="otp-help" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} className="mt-2 h-16 rounded-2xl border bg-surface px-4 text-center font-mono text-3xl tracking-[.35em] outline-none focus:ring-2 focus:ring-crimson/25" placeholder="000000"/>
          <p id="otp-help" className="mt-3 text-sm leading-6 text-stone">Codes expire shortly. Email users can also open the secure sign-in link in the same browser.</p>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-crimson">{error}</p>}
          <Button onClick={verify} disabled={busy} className="mt-6 w-full">{busy ? "Checking…" : "Verify & continue"}</Button>
          <button type="button" className="mt-4 flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-stone" onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}><RotateCcw size={16}/>Change {method}</button>
        </>}
      </div>
      <p className="text-center text-xs leading-5 text-stone">By continuing, you agree to our Terms and acknowledge our Privacy and Safety policies.</p>
    </main>
  );
}
