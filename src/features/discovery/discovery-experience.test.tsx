import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/domain";
import { DiscoveryExperience } from "./discovery-experience";

const uploadedProfile: Profile = {
  id: "uploaded-user",
  firstName: "Nima",
  age: 26,
  verified: false,
  city: "Patan",
  from: "Pokhara",
  occupation: "Designer",
  intent: "Long-term relationship",
  interests: ["Coffee", "Photography"],
  languages: ["Nepali", "English"],
  lifestyle: ["Non-smoker"],
  prompt: "Perfect Saturday looks like…",
  answer: "Coffee and a long photo walk.",
  bio: "A thoughtful fictional profile used for UI testing.",
  thumbnailUrl: "/images/uploaded-profile.webp",
  promptAffinity: 0.7,
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("discovery profile photos", () => {
  it("renders the uploaded thumbnail instead of the initials placeholder", () => {
    render(<DiscoveryExperience initialQueue={[uploadedProfile]} demoMode={false} />);

    const image = screen.getByAltText("Nima's profile photo");
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("src")).toContain("uploaded-profile.webp");
  });
});
