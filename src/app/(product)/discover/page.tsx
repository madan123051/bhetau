import { DiscoveryExperience, type DiscoveryViewer } from "@/features/discovery/discovery-experience";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { loadSignedProfilePhotoUrls } from "@/lib/supabase/profile-photo-urls";
import { getCurrentProductSession } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

type InterestRow = { user_id: string; interests: { label_en: string } | { label_en: string }[] | null };

function interestLabels(rows: InterestRow[] | null, userId: string) {
  return (rows ?? []).filter((row) => row.user_id === userId).flatMap((row) => Array.isArray(row.interests) ? row.interests : row.interests ? [row.interests] : []).map((interest) => interest.label_en);
}

function promptAnswer(value: unknown) {
  const first = Array.isArray(value) && value[0] && typeof value[0] === "object" ? value[0] as { prompt?: unknown; answer?: unknown } : null;
  return {
    prompt: typeof first?.prompt === "string" ? first.prompt : "A little about me",
    answer: typeof first?.answer === "string" ? first.answer : "Still putting this profile together.",
  };
}

export default async function DiscoverPage() {
  if (!hasSupabaseEnv) return <DiscoveryExperience />;

  const { supabase, userId } = await getCurrentProductSession();
  if (!userId) return <DiscoveryExperience initialQueue={[]} demoMode={false} />;

  const candidatesPromise = Promise.resolve(
    supabase!.from("profiles").select("user_id, first_name, current_area, from_place, occupation, relationship_intention, languages, lifestyle, bio, prompt_answers, show_age").neq("user_id", userId).order("last_active_at", { ascending: false, nullsFirst: false }).limit(30),
  );
  const thumbnailUrlsPromise = candidatesPromise.then((result) => loadSignedProfilePhotoUrls(supabase!, [
    userId,
    ...(result.data ?? []).map((candidate) => candidate.user_id),
  ]));
  const [profileResult, preferencesResult, interestResult, candidatesResult, thumbnailUrls] = await Promise.all([
    supabase!.from("profiles").select("first_name, current_area, relationship_intention, languages, lifestyle").eq("user_id", userId).maybeSingle(),
    supabase!.from("preferences").select("min_age, max_age").eq("user_id", userId).maybeSingle(),
    supabase!.from("user_interests").select("user_id, interests(label_en)"),
    candidatesPromise,
    thumbnailUrlsPromise,
  ]);

  const candidates = candidatesResult.data ?? [];

  const viewer: DiscoveryViewer = {
    firstName: profileResult.data?.first_name ?? "You",
    ageRange: [preferencesResult.data?.min_age ?? 18, preferencesResult.data?.max_age ?? 40],
    city: profileResult.data?.current_area ?? "",
    intent: profileResult.data?.relationship_intention ?? "Meet & see",
    interests: interestLabels(interestResult.data as InterestRow[] | null, userId),
    languages: profileResult.data?.languages ?? [],
    lifestyle: profileResult.data?.lifestyle ?? [],
    thumbnailUrl: thumbnailUrls.get(userId) ?? null,
  };

  const queue: Profile[] = candidates.map((candidate) => {
    const prompt = promptAnswer(candidate.prompt_answers);
    return {
      id: candidate.user_id,
      firstName: candidate.first_name,
      age: null,
      verified: false,
      city: candidate.current_area,
      from: candidate.from_place ?? "",
      occupation: candidate.occupation ?? "",
      intent: candidate.relationship_intention as Profile["intent"],
      interests: interestLabels(interestResult.data as InterestRow[] | null, candidate.user_id),
      languages: candidate.languages ?? [],
      lifestyle: candidate.lifestyle ?? [],
      prompt: prompt.prompt,
      answer: prompt.answer,
      bio: candidate.bio,
      thumbnailUrl: thumbnailUrls.get(candidate.user_id) ?? null,
      promptAffinity: 0.5,
    };
  });

  return <DiscoveryExperience initialQueue={queue} viewer={viewer} demoMode={false} />;
}
