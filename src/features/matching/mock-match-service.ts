export interface MatchResult {
  liked: true;
  matched: boolean;
  matchId?: string;
  conversationId?: string;
}

export class MockMatchService {
  private likes = new Set<string>();
  private matches = new Map<string, MatchResult>();

  constructor(seedLikes: Array<[string, string]> = []) {
    seedLikes.forEach(([actor, target]) => this.likes.add(`${actor}:${target}`));
  }

  like(actorId: string, targetId: string): MatchResult {
    if (actorId === targetId) throw new Error("You cannot like your own profile.");
    this.likes.add(`${actorId}:${targetId}`);
    const [low, high] = [actorId, targetId].sort();
    const pair = `${low}:${high}`;
    const reciprocal = this.likes.has(`${targetId}:${actorId}`);

    if (!reciprocal) return { liked: true, matched: false };
    if (!this.matches.has(pair)) {
      this.matches.set(pair, {
        liked: true,
        matched: true,
        matchId: `match-${pair}`,
        conversationId: `conversation-${pair}`,
      });
    }
    return this.matches.get(pair)!;
  }

  matchCount() {
    return this.matches.size;
  }
}

export const demoMatchService = new MockMatchService([
  ["aashika", "demo-user"],
  ["suman", "demo-user"],
]);
