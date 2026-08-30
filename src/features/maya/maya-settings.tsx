"use client";

import { Languages, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { defaultMayaPreferences, type StoredMayaPreferences } from "@/lib/maya/preferences";

type BooleanPreference = "enabled" | "translationSuggestions" | "conversationSuggestions" | "safetyAlerts" | "aiPersonalization";

export function MayaSettings() {
  const [preferences, setPreferences] = useState(defaultMayaPreferences);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/maya/preferences", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (body?.preferences) setPreferences(body.preferences); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const save = async (patch: Partial<StoredMayaPreferences>) => {
    const previous = preferences;
    setPreferences({ ...preferences, ...patch }); setBusy(true); setNotice("");
    const response = await fetch("/api/maya/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { setPreferences(previous); setNotice("Maya settings could not be saved."); return; }
    const body = await response.json().catch(() => null);
    if (body?.preferences) {
      setPreferences(body.preferences);
      if (typeof body.preferences.enabled === "boolean") window.dispatchEvent(new CustomEvent("bhetau:maya-enabled", { detail: { enabled: body.preferences.enabled } }));
    }
  };
  const toggle = (key: BooleanPreference) => save({ [key]: !preferences[key] });
  const clearHistory = async () => {
    setBusy(true); const response = await fetch("/api/maya", { method: "DELETE" }).catch(() => null); setBusy(false);
    setNotice(response?.ok ? "Maya request history cleared." : "Maya history could not be cleared.");
  };

  return <section className="mx-5 mt-7"><h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[.13em] text-stone">Maya · AI assistant</h2><div className="overflow-hidden rounded-[22px] border bg-surface"><div className="flex items-start gap-3 border-b bg-gradient-to-br from-crimson/7 to-transparent p-4"><span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-crimson/10 text-crimson"><Sparkles size={18}/></span><div><div className="flex items-center gap-2"><p className="text-sm font-semibold">Your private wingmate</p><span className="rounded-full bg-crimson/10 px-2 py-0.5 text-[9px] font-bold text-crimson">AI</span></div><p className="mt-1 text-xs leading-5 text-stone">Maya is optional AI assistance—not a person, profile, or match.</p></div></div><MayaToggle label="Maya enabled" hint="Show Maya and allow requests" value={preferences.enabled} busy={busy} onChange={() => toggle("enabled")}/><MayaToggle label="Conversation suggestions" value={preferences.conversationSuggestions} busy={busy} onChange={() => toggle("conversationSuggestions")}/><MayaToggle label="Translation suggestions" value={preferences.translationSuggestions} busy={busy} onChange={() => toggle("translationSuggestions")}/><MayaToggle label="Safety alerts" hint="Show cautious, non-certain warnings" value={preferences.safetyAlerts} busy={busy} onChange={() => toggle("safetyAlerts")}/><MayaToggle label="AI personalization" hint="Use existing intent and interests only" value={preferences.aiPersonalization} busy={busy} onChange={() => toggle("aiPersonalization")}/><label className="flex min-h-16 items-center gap-3 border-t px-4"><Languages size={18} className="text-stone"/><span className="flex-1 text-sm font-medium">Preferred Maya language</span><select disabled={busy} value={preferences.preferredLanguage} onChange={(event) => save({ preferredLanguage: event.target.value as StoredMayaPreferences["preferredLanguage"] })} className="h-11 rounded-xl border bg-background px-2 text-sm"><option value="en">English</option><option value="ne">नेपाली</option><option value="roman-ne">Roman Nepali</option><option value="hi">Hindi</option></select></label><button type="button" disabled={busy} onClick={clearHistory} className="flex min-h-16 w-full items-center gap-3 border-t px-4 text-left text-crimson disabled:opacity-60"><Trash2 size={18}/><span className="flex-1 text-sm font-medium">Clear Maya history</span></button></div><p className="mt-2 px-1 text-[10px] leading-4 text-stone">Maya processes only the requested context, with at most 10 recent messages. Raw private conversations are not stored in Maya analytics.</p>{notice && <p role="status" className={`mt-2 rounded-2xl px-4 py-3 text-xs font-medium ${notice.includes("could not") ? "bg-crimson/10 text-crimson" : "bg-success/10 text-success"}`}>{notice}</p>}</section>;
}

function MayaToggle({ label, hint, value, busy, onChange }: { label: string; hint?: string; value: boolean; busy: boolean; onChange: () => void }) {
  return <button type="button" role="switch" aria-checked={value} disabled={busy} onClick={onChange} className="flex min-h-16 w-full items-center gap-3 border-t px-4 text-left disabled:opacity-60"><span className="flex-1"><span className="block text-sm font-medium">{label}</span>{hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}</span><span className={`relative h-7 w-12 rounded-full ${value ? "bg-crimson" : "bg-foreground/15"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${value ? "left-6" : "left-1"}`}/></span></button>;
}
