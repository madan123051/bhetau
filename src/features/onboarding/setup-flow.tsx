"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Camera, Check, MapPin, Plus, X } from "lucide-react";
import { Wordmark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { dateOfBirthSchema, sanitizeProfileText } from "@/lib/validation/schemas";

const intents = ["Long-term relationship", "Something casual", "Meet & see", "New friends", "Still figuring it out"];
const genders = ["Woman", "Man", "Non-binary", "Prefer to self-describe"];
const meet = ["Women", "Men", "Non-binary people", "Everyone"];
const languageOptions = ["नेपाली", "English", "Maithili", "Newa", "Bhojpuri", "Tamang", "Tibetan", "Hindi"];
const interestOptions = ["Photography", "Coffee", "Trekking", "Momo", "Books", "Live music", "Cycling", "Cooking", "Pottery", "Running", "Films", "Yoga"];

export function SetupFlow() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [data, setData] = useState({ name: "", dob: "", gender: "", meet: [] as string[], intent: "", city: "", from: "", languages: [] as string[], interests: [] as string[], bio: "", prompt: "You should message me if…", answer: "", photos: [] as string[] });

  const steps = useMemo(() => [
    { label: "YOUR NAME", title: "What should we call you?", hint: "Your first name is shown on your profile.", content: <input autoFocus aria-label="First name" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="First name" className="mt-8 h-16 w-full rounded-2xl border bg-surface px-5 text-xl outline-none focus:ring-2 focus:ring-crimson/25"/> },
    { label: "18+ ONLY", title: "When were you born?", hint: "Your age is shown, never your full birthday.", content: <input aria-label="Date of birth" type="date" value={data.dob} onChange={(e) => setData({ ...data, dob: e.target.value })} className="mt-8 h-16 w-full rounded-2xl border bg-surface px-5 text-lg outline-none focus:ring-2 focus:ring-crimson/25"/> },
    { label: "ABOUT YOU", title: "How do you describe yourself?", hint: "Choose what feels right. You can change this later.", content: <OptionGrid options={genders} selected={data.gender ? [data.gender] : []} onSelect={(value) => setData({ ...data, gender: value })}/> },
    { label: "YOUR PREFERENCES", title: "Who would you like to meet?", hint: "Choose one or more. We never use caste as a matching signal.", content: <OptionGrid options={meet} selected={data.meet} onSelect={(value) => setData({ ...data, meet: toggle(data.meet, value) })}/> },
    { label: "YOUR INTENTION", title: "What are you looking for?", hint: "This appears prominently, so everyone can be clear.", content: <OptionGrid options={intents} selected={data.intent ? [data.intent] : []} onSelect={(value) => setData({ ...data, intent: value })}/> },
    { label: "APPROXIMATE ONLY", title: "Where do you call home?", hint: "We show a city or area—never an exact distance.", content: <div className="mt-8 space-y-3"><label className="flex h-16 items-center gap-3 rounded-2xl border bg-surface px-5"><MapPin size={19} className="text-crimson"/><input aria-label="Currently in" value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} placeholder="Currently in · e.g. Around Patan" className="min-w-0 flex-1 bg-transparent outline-none"/></label><input aria-label="From" value={data.from} onChange={(e) => setData({ ...data, from: e.target.value })} placeholder="From · optional" className="h-16 w-full rounded-2xl border bg-surface px-5 outline-none"/></div> },
    { label: "HOW YOU SPEAK", title: "Which languages feel natural?", hint: "Select all the languages you’d enjoy connecting in.", content: <OptionGrid options={languageOptions} selected={data.languages} onSelect={(value) => setData({ ...data, languages: toggle(data.languages, value) })}/> },
    { label: "YOUR WORLD", title: "What lights you up?", hint: "Pick at least three. These shape shared-vibe reasons.", content: <OptionGrid options={interestOptions} selected={data.interests} onSelect={(value) => setData({ ...data, interests: toggle(data.interests, value) })}/> },
    { label: "MAKE IT YOURS", title: "Give someone a reason to pause.", hint: "A portrait first photo works best. Add up to six.", content: <div className="mt-7 space-y-5"><div className="grid grid-cols-3 gap-3">{[0,1,2].map((i) => <label key={i} className="grid aspect-[4/5] cursor-pointer place-items-center rounded-[20px] border border-dashed bg-surface text-stone"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const name = e.target.files?.[0]?.name; if (name) setData({ ...data, photos: [...data.photos, name].slice(0,6) }); }}/>{data.photos[i] ? <span className="px-2 text-center text-xs"><Check className="mx-auto mb-1 text-success"/>{data.photos[i]}</span> : i === 0 ? <><Camera/><span className="text-xs font-semibold">First photo</span></> : <Plus/>}</label>)}</div><textarea aria-label="Short bio" value={data.bio} onChange={(e) => setData({ ...data, bio: sanitizeProfileText(e.target.value) })} maxLength={500} placeholder="A short bio—what feels unmistakably you?" className="min-h-24 w-full resize-none rounded-2xl border bg-surface p-4 outline-none focus:ring-2 focus:ring-crimson/25"/><select aria-label="Profile prompt" value={data.prompt} onChange={(e) => setData({ ...data, prompt: e.target.value })} className="h-14 w-full rounded-2xl border bg-surface px-4"><option>You should message me if…</option><option>Best momo spot?</option><option>Perfect Saturday looks like…</option><option>Mountain or city?</option><option>My comfort food is…</option></select><textarea aria-label="Prompt answer" value={data.answer} onChange={(e) => setData({ ...data, answer: sanitizeProfileText(e.target.value) })} placeholder="Your answer" className="min-h-20 w-full resize-none rounded-2xl border bg-surface p-4 outline-none focus:ring-2 focus:ring-crimson/25"/></div> },
  ], [data]);

  const validate = () => {
    setError("");
    if (step === 0 && data.name.trim().length < 2) return setError("Please enter your first name."), false;
    if (step === 1) { const result = dateOfBirthSchema.safeParse(data.dob); if (!result.success) return setError(result.error.issues[0].message), false; }
    if (step === 2 && !data.gender) return setError("Choose one option to continue."), false;
    if (step === 3 && !data.meet.length) return setError("Choose at least one option."), false;
    if (step === 4 && !data.intent) return setError("Choose what you’re looking for."), false;
    if (step === 5 && data.city.trim().length < 2) return setError("Add your city or approximate area."), false;
    if (step === 6 && !data.languages.length) return setError("Choose at least one language."), false;
    if (step === 7 && data.interests.length < 3) return setError("Choose at least three interests."), false;
    if (step === 8 && (data.bio.length < 20 || data.answer.length < 8)) return setError("Add a little more to your bio and prompt answer."), false;
    return true;
  };
  const next = () => { if (!validate()) return; if (step === steps.length - 1) { localStorage.setItem("bhetau-profile", JSON.stringify(data)); router.push("/discover"); } else setStep(step + 1); };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-background px-5 pb-7 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between"><button onClick={() => step ? setStep(step - 1) : router.back()} className="grid size-11 place-items-center rounded-full border" aria-label="Go back"><ArrowLeft size={19}/></button><Wordmark compact/><button onClick={() => router.push("/discover")} className="min-h-11 px-1 text-xs font-semibold text-stone">Demo skip</button></div>
      <div className="mt-6 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-gradient-to-r from-[#ff5a72] to-[#d72c55] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div><span className="text-xs font-bold text-stone">{step + 1} of {steps.length}</span></div>
      <div className="flex flex-1 flex-col pt-12">
        <AnimatePresence mode="wait">
          <motion.section key={step} initial={reduced ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: -18 }} transition={{ duration: .25 }}>
            <p className="text-xs font-bold tracking-[.16em] text-crimson">{steps[step].label}</p><h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.06] tracking-[-.05em]">{steps[step].title}</h1><p className="mt-3 text-sm leading-6 text-stone">{steps[step].hint}</p>{steps[step].content}
          </motion.section>
        </AnimatePresence>
        {error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm font-medium text-crimson"><X size={16}/>{error}</p>}
      </div>
      <Button onClick={next} className="mt-6 w-full">{step === steps.length - 1 ? "Finish profile" : "Continue"}<ArrowRight size={18}/></Button>
    </main>
  );
}

function toggle(items: string[], value: string) { return items.includes(value) ? items.filter((item) => item !== value) : [...items, value]; }
function OptionGrid({ options, selected, onSelect }: { options: string[]; selected: string[]; onSelect: (value: string) => void }) { return <div className="mt-8 grid gap-3">{options.map((option) => { const active = selected.includes(option); return <button type="button" key={option} onClick={() => onSelect(option)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-5 text-left font-medium transition ${active ? "border-crimson bg-crimson/7 text-wine dark:text-[#ff9aac]" : "bg-surface hover:border-foreground/25"}`}><span>{option}</span><span className={`grid size-6 place-items-center rounded-full border ${active ? "border-crimson bg-crimson text-white" : "text-transparent"}`}><Check size={14}/></span></button>; })}</div>; }
