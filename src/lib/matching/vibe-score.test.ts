import { describe, expect, it } from "vitest";
import { currentUser, profiles } from "@/data/profiles";
import { calculateVibeScore } from "./vibe-score";

describe("calculateVibeScore", () => {
  it("returns a deterministic, explainable score", () => {
    const score = calculateVibeScore(currentUser, profiles[0]);
    expect(score.score).toBe(82);
    expect(score.filtered).toBe(false);
    expect(score.reasons).toContain("Both looking for long-term relationship.");
  });

  it("uses age preference as a hard filter", () => {
    const score = calculateVibeScore({ ...currentUser, ageRange: [30, 35] }, profiles[0]);
    expect(score).toEqual({ score: 0, reasons: [], filtered: true });
  });
});
