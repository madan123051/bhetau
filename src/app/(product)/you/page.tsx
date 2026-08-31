import { SettingsExperience } from "@/features/profile/settings-experience";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentProductSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { CurrentUserProfile } from "@/types/domain";

function ageFromBirthDate(value: string | null) {
  if (!value) return null;
  const today = new Date();
  const birth = new Date(`${value}T00:00:00Z`);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayPassed = today.getUTCMonth() > birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

const demoProfile: CurrentUserProfile = {
  userId: null,
  firstName: "Samira",
  age: 25,
  city: "Around Patan",
  verified: true,
  completion: 92,
  contact: "",
  settings: { age: true, city: true, active: false, receipts: true, visibility: true, incognito: false },
};

export default async function YouPage() {
  if (!hasSupabaseEnv) return <SettingsExperience profile={demoProfile}/>;

  const { supabase, claims, userId, account } = await getCurrentProductSession();
  if (!supabase || !userId) redirect("/auth");
  const [profileResult, interestsResult, photosResult] = await Promise.all([
    supabase!.from("profiles").select("first_name, current_area, gender, relationship_intention, languages, bio, prompt_answers, show_age, show_city, show_active_status, read_receipts, discovery_paused, incognito").eq("user_id", userId).single(),
    supabase!.from("user_interests").select("interest_id").eq("user_id", userId),
    supabase!.from("profile_photos").select("id").eq("user_id", userId),
  ]);
  const profile = profileResult.data;
  if (!profile) redirect("/setup?recovery=profile");
  const completed = [profile.first_name, profile.gender, profile.relationship_intention, profile.current_area, profile.languages?.length, profile.bio, Array.isArray(profile.prompt_answers) && profile.prompt_answers.length, interestsResult.data?.length, photosResult.data?.length].filter(Boolean).length;
  const contact = typeof claims?.phone === "string" && claims.phone ? claims.phone : typeof claims?.email === "string" ? claims.email : "";

  return <SettingsExperience profile={{
    userId,
    firstName: profile.first_name,
    age: ageFromBirthDate(account?.birth_date ?? null),
    city: profile.current_area,
    verified: account?.verification === "verified" || account?.verification === "phone_verified",
    completion: Math.round((completed / 9) * 100),
    contact,
    settings: {
      age: profile.show_age,
      city: profile.show_city,
      active: profile.show_active_status,
      receipts: profile.read_receipts,
      visibility: !profile.discovery_paused,
      incognito: profile.incognito,
    },
  }}/>;
}
