import { describe, expect, it } from "vitest";
import { dateOfBirthSchema, profileSettingsSchema, profileSetupSchema, sanitizeProfileText } from "./schemas";

describe("critical profile validation", () => {
  it("rejects anyone under 18", () => {
    const minor = new Date(); minor.setFullYear(minor.getFullYear() - 17);
    expect(dateOfBirthSchema.safeParse(minor).success).toBe(false);
  });

  it("accepts an adult and removes markup from profile copy", () => {
    const adult = new Date(); adult.setFullYear(adult.getFullYear() - 21);
    expect(dateOfBirthSchema.safeParse(adult).success).toBe(true);
    expect(sanitizeProfileText("  hello <script> world  ")).toBe("hello script world");
  });

  it("validates a complete persisted profile payload", () => {
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 24);
    const dob = adult.toISOString().slice(0, 10);
    expect(profileSetupSchema.safeParse({
      name: "Aarya",
      dob,
      gender: "Woman",
      meet: ["Men"],
      intent: "Long-term relationship",
      city: "Around Patan",
      from: "Pokhara",
      languages: ["नेपाली", "English"],
      interests: ["Photography", "Coffee", "Trekking"],
      bio: "I collect quiet corners and very strong coffee.",
      prompt: "Perfect Saturday looks like…",
      answer: "A slow breakfast and a long walk.",
    }).success).toBe(true);
  });

  it("rejects incomplete settings updates", () => {
    expect(profileSettingsSchema.safeParse({}).success).toBe(false);
  });
});
