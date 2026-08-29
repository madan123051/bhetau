import { describe, expect, it } from "vitest";
import { MockMatchService } from "./mock-match-service";

describe("like-to-match service", () => {
  it("creates exactly one match and conversation after a reciprocal like", () => {
    const service = new MockMatchService([["person-b", "person-a"]]);
    const first = service.like("person-a", "person-b");
    const retry = service.like("person-a", "person-b");
    expect(first.matched).toBe(true);
    expect(first.matchId).toBe(retry.matchId);
    expect(first.conversationId).toBe(retry.conversationId);
    expect(service.matchCount()).toBe(1);
  });

  it("does not create a match for a one-way like", () => {
    const service = new MockMatchService();
    expect(service.like("person-a", "person-b")).toEqual({ liked: true, matched: false });
  });
});
