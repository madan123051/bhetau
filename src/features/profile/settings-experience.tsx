"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronRight, Download, EyeOff, Languages, LockKeyhole, LogOut, PauseCircle, ShieldCheck, Trash2, type LucideIcon } from "lucide-react";
import { Portrait } from "@/components/profile/portrait";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { dictionaries, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { CurrentUserProfile } from "@/types/domain";

type SettingKey = keyof CurrentUserProfile["settings"];

export function SettingsExperience({ profile }: { profile: CurrentUserProfile }) {
  const router = useRouter();
  const [settings, setSettings] = useState(profile.settings);
  const [locale, setLocale] = useState<Locale>("en");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<SettingKey | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const t = dictionaries[locale];

  const toggle = async (key: SettingKey) => {
    const nextValue = !settings[key];
    const previous = settings;
    setSettings({ ...settings, [key]: nextValue });
    setSaving(key);
    setNotice("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: nextValue }),
    }).catch(() => null);
    setSaving(null);
    if (!response?.ok) {
      setSettings(previous);
      const body = response ? await response.json().catch(() => null) : null;
      setNotice(body?.error ?? "That setting could not be saved. Please try again.");
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    if (hasSupabaseEnv) await getSupabaseBrowserClient()!.auth.signOut();
    else localStorage.removeItem("bhetau-profile");
    router.replace("/");
    router.refresh();
  };

  return <main className="pb-8 pt-[max(22px,env(safe-area-inset-top))]">
    <div className="flex items-center justify-between px-5"><div><p className="text-xs font-bold tracking-[.14em] text-crimson">YOUR SPACE</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.04em]">You</h1></div><ThemeToggle/></div>
    <section className="mx-5 mt-6 flex items-center gap-4 rounded-[24px] border bg-surface p-4"><Portrait quadrant="bl" alt={`${profile.firstName}'s profile placeholder`} className="size-20 shrink-0 rounded-[20px]"/><div className="min-w-0 flex-1"><p className="text-xl font-semibold">{profile.firstName}{profile.age ? `, ${profile.age}` : ""} {profile.verified && <span className="text-success" aria-label="Verified">✓</span>}</p><p className="mt-1 truncate text-sm text-stone">{profile.city} · {profile.completion}% complete</p>{profile.contact && <p className="mt-1 truncate text-xs text-stone">Signed in as {profile.contact}</p>}<Link href="/setup" className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-crimson">Edit profile</Link></div><ChevronRight size={19} className="text-stone"/></section>
    {notice && <div role="status" className={`mx-5 mt-4 rounded-2xl px-4 py-3 text-xs font-medium ${notice.includes("could not") || notice.includes("error") ? "bg-crimson/10 text-crimson" : "bg-success/10 text-success"}`}>{notice}</div>}
    <SettingsSection title="Discovery & privacy"><SettingToggle icon={PauseCircle} label="Discovery visibility" hint="Pause your profile from being shown" value={settings.visibility} busy={saving !== null} onChange={() => toggle("visibility")}/><SettingToggle icon={EyeOff} label="Incognito mode" hint="Only people you like can see you" value={settings.incognito} busy={saving !== null} onChange={() => toggle("incognito")}/><SettingToggle label="Show age" value={settings.age} busy={saving !== null} onChange={() => toggle("age")}/><SettingToggle label="Show city" hint="Approximate area only" value={settings.city} busy={saving !== null} onChange={() => toggle("city")}/><SettingToggle label="Show active status" value={settings.active} busy={saving !== null} onChange={() => toggle("active")}/><SettingToggle label="Read receipts" value={settings.receipts} busy={saving !== null} onChange={() => toggle("receipts")}/></SettingsSection>
    <SettingsSection title="Safety & account"><LinkRow href="/safety" icon={ShieldCheck} label="Safety center"/><LinkRow href="#" icon={LockKeyhole} label="Blocked users"/><LinkRow href="#" icon={Bell} label="Notifications"/></SettingsSection>
    <SettingsSection title="Language"><div className="flex min-h-16 items-center gap-3 px-4"><Languages size={19} className="text-stone"/><div className="flex-1"><p className="text-sm font-medium">Interface language</p><p className="mt-1 font-devanagari text-xs text-stone">{t.lookingFor}</p></div><select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="h-11 rounded-xl border bg-background px-3 text-sm"><option value="en">English</option><option value="ne">नेपाली</option></select></div></SettingsSection>
    <SettingsSection title="Your data"><button type="button" onClick={() => setNotice("Data export requires a verified delivery job and will be enabled in the next production phase.")} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><Download size={19} className="text-stone"/><span className="flex-1 text-sm font-medium">Download my data</span><ChevronRight size={17} className="text-stone"/></button><button type="button" onClick={() => setNotice("Account deletion requires re-authentication and a cooling-off period; no account was deleted.")} className="flex min-h-16 w-full items-center gap-3 border-t px-4 text-left text-crimson"><Trash2 size={19}/><span className="flex-1 text-sm font-medium">Delete account</span><ChevronRight size={17}/></button></SettingsSection>
    <button type="button" disabled={signingOut} onClick={signOut} className="mx-5 mt-3 flex min-h-14 w-[calc(100%_-_2.5rem)] items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-stone disabled:opacity-60"><LogOut size={18}/>{signingOut ? "Signing out…" : "Sign out"}</button><p className="mt-5 text-center text-[11px] text-stone">{profile.userId ? "Secure Supabase session" : "Bhetau demo · v0.1"}</p>
  </main>;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mx-5 mt-7"><h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[.13em] text-stone">{title}</h2><div className="divide-y overflow-hidden rounded-[22px] border bg-surface">{children}</div></section>; }
function SettingToggle({ icon: Icon, label, hint, value, busy, onChange }: { icon?: LucideIcon; label: string; hint?: string; value: boolean; busy: boolean; onChange: () => void }) { return <button type="button" role="switch" aria-checked={value} aria-busy={busy} disabled={busy} onClick={onChange} className="flex min-h-16 w-full items-center gap-3 px-4 text-left disabled:opacity-65">{Icon && <Icon size={19} className="text-stone"/>}<span className="flex-1"><span className="block text-sm font-medium">{label}</span>{hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}</span><span className={`relative h-7 w-12 rounded-full transition ${value ? "bg-crimson" : "bg-foreground/15"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${value ? "left-6" : "left-1"}`}/></span></button>; }
function LinkRow({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) { return <Link href={href} className="flex min-h-16 items-center gap-3 px-4"><Icon size={19} className="text-stone"/><span className="flex-1 text-sm font-medium">{label}</span><ChevronRight size={17} className="text-stone"/></Link>; }
