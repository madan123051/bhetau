import { redirect } from "next/navigation";
import { SetupFlow } from "@/features/onboarding/setup-flow";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileSetupData, RelationshipIntent } from "@/types/domain";

type PromptAnswer = { prompt?: string; answer?: string };

export default async function SetupPage() {
  if (!hasSupabaseEnv) return <SetupFlow demoMode/>;

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase!.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) redirect("/auth");

  const [accountResult, profileResult, preferencesResult, interestsResult] = await Promise.all([
    supabase!.from("users").select("birth_date").eq("id", userId).maybeSingle(),
    supabase!.from("profiles").select("first_name, gender, relationship_intention, current_area, from_place, languages, bio, prompt_answers").eq("user_id", userId).maybeSingle(),
    supabase!.from("preferences").select("interested_in").eq("user_id", userId).maybeSingle(),
    supabase!.from("user_interests").select("interests(label_en)").eq("user_id", userId),
  ]);

  const profile = profileResult.data;
  const promptAnswers = Array.isArray(profile?.prompt_answers) ? profile.prompt_answers as PromptAnswer[] : [];
  const firstPrompt = promptAnswers[0] ?? {};
  const interests = (interestsResult.data ?? []).flatMap((row) => {
    const relation = row.interests as unknown as { label_en?: string } | { label_en?: string }[] | null;
    if (Array.isArray(relation)) return relation.flatMap((item) => item.label_en ? [item.label_en] : []);
    return relation?.label_en ? [relation.label_en] : [];
  });

  const initialData: ProfileSetupData | undefined = profile ? {
    name: profile.first_name,
    dob: accountResult.data?.birth_date ?? "",
    gender: profile.gender,
    meet: preferencesResult.data?.interested_in ?? [],
    intent: profile.relationship_intention as RelationshipIntent,
    city: profile.current_area,
    from: profile.from_place ?? "",
    languages: profile.languages ?? [],
    interests,
    bio: profile.bio,
    prompt: firstPrompt.prompt ?? "You should message me if…",
    answer: firstPrompt.answer ?? "",
    photos: [],
  } : undefined;

  return <SetupFlow initialData={initialData}/>;
}
