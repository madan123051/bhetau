import type { Profile, VibeScore } from "@/types/domain";

type Viewer = {
  ageRange: readonly [number, number];
  city: string;
  intent: string;
  interests: string[];
  languages: string[];
  lifestyle: string[];
};

const overlap = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const normalized = new Set(a.map((item) => item.toLowerCase()));
  return b.filter((item) => normalized.has(item.toLowerCase())).length / Math.max(a.length, b.length);
};

export function calculateVibeScore(viewer: Viewer, profile: Profile): VibeScore {
  if (profile.age !== null && (profile.age < viewer.ageRange[0] || profile.age > viewer.ageRange[1])) {
    return { score: 0, reasons: [], filtered: true };
  }

  const sharedInterests = profile.interests.filter((interest) =>
    viewer.interests.some((candidate) => candidate.toLowerCase() === interest.toLowerCase()),
  );
  const sharedLanguages = profile.languages.filter((language) => viewer.languages.includes(language));
  const sharedLifestyle = profile.lifestyle.filter((item) => viewer.lifestyle.includes(item));
  const sameIntent = viewer.intent === profile.intent;
  const nearby = viewer.city === profile.city || [viewer.city, profile.city].some((city) => city.includes("Patan") || city.includes("Lalitpur"));

  const weighted =
    overlap(viewer.interests, profile.interests) * 30 +
    (sameIntent ? 1 : 0.35) * 25 +
    overlap(viewer.lifestyle, profile.lifestyle) * 15 +
    (nearby ? 1 : 0.45) * 10 +
    overlap(viewer.languages, profile.languages) * 10 +
    profile.promptAffinity * 10;

  const reasons: string[] = [];
  if (sharedInterests.length) reasons.push(`You both like ${sharedInterests.slice(0, 3).join(", ").toLowerCase()}.`);
  if (sameIntent) reasons.push(`Both looking for ${profile.intent.toLowerCase()}.`);
  if (sharedLanguages.length > 1) reasons.push(`You share ${sharedLanguages.length} languages.`);
  if (sharedLifestyle.length) reasons.push(`A similar ${sharedLifestyle[0].toLowerCase()} rhythm.`);

  return { score: Math.max(51, Math.min(97, Math.round(weighted))), reasons, filtered: false };
}
