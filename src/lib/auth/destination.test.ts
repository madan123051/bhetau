import { describe, expect, it } from "vitest";
import { destinationForSignedInUser } from "./destination";

describe("returning-user destination", () => {
  it("sends completed profiles directly to Discover", () => {
    expect(destinationForSignedInUser({ onboarding_completed_at: "2026-09-01T00:00:00Z" })).toBe("/discover");
  });

  it("keeps genuinely incomplete accounts in profile setup", () => {
    expect(destinationForSignedInUser({ onboarding_completed_at: null })).toBe("/setup");
    expect(destinationForSignedInUser(null)).toBe("/setup");
  });
});
