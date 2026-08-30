type KnowledgeEntry = { keywords: string[]; title: string; answer: string };

const knowledgeBase: KnowledgeEntry[] = [
  { keywords: ["hide", "pause", "profile", "discovery"], title: "Hide your profile", answer: "Open You → Discovery & privacy, then turn off Discovery visibility. Existing matches can still access their conversations." },
  { keywords: ["block", "blocked"], title: "Block someone", answer: "Open the chat safety menu, choose Block, and confirm. Blocking removes both people from discovery and prevents messaging." },
  { keywords: ["report", "harassment", "scam"], title: "Report a concern", answer: "Open the profile or chat safety menu and choose Report. Select the closest reason and add only the details needed for review." },
  { keywords: ["delete", "account"], title: "Delete your account", answer: "Open You → Your data → Delete account. Production deletion requires re-authentication and a short cooling-off period." },
  { keywords: ["vibe", "match", "score"], title: "How Vibe Match works", answer: "Vibe Match is a Bhetau recommendation score based on shared interests, relationship intent, lifestyle, approximate area, languages, and prompt affinity. It is not scientific compatibility." },
  { keywords: ["location", "distance", "gps"], title: "Approximate location", answer: "Bhetau shows only a coarse city or area. Exact GPS distance is not displayed on profiles." },
  { keywords: ["maya", "privacy", "data", "history"], title: "Maya and privacy", answer: "Maya receives only the information needed for the action you request, with at most 10 recent messages. Bhetau does not store raw private conversations in Maya analytics." },
];

export function findBhetauHelp(query: string) {
  const words = query.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  let best = knowledgeBase[0];
  let score = -1;
  for (const entry of knowledgeBase) {
    const nextScore = entry.keywords.filter((keyword) => words.some((word) => word.includes(keyword) || keyword.includes(word))).length;
    if (nextScore > score) { best = entry; score = nextScore; }
  }
  return score > 0 ? best : { title: "Bhetau help", answer: "I can explain profile visibility, blocking, reporting, account deletion, location privacy, Vibe Match, or Maya privacy." };
}

export { knowledgeBase };
