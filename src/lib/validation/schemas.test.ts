import { describe, expect, it } from "vitest";
import { conversationSettingsSchema, dateOfBirthSchema, messageMutationSchema, profileSettingsSchema, profileSetupSchema, sanitizeProfileText, sanitizeProfileTextStrict } from "./schemas";

describe("critical profile validation", () => {
  it("rejects anyone under 18", () => {
    const minor = new Date(); minor.setFullYear(minor.getFullYear() - 17);
    expect(dateOfBirthSchema.safeParse(minor).success).toBe(false);
  });

  it("accepts an adult and removes markup from profile copy", () => {
    const adult = new Date(); adult.setFullYear(adult.getFullYear() - 21);
    expect(dateOfBirthSchema.safeParse(adult).success).toBe(true);
    expect(sanitizeProfileTextStrict("  hello <script> world  ")).toBe("hello script world");
  });

  it("preserves spaces while profile copy is being typed", () => {
    expect(sanitizeProfileText("How are you ")).toBe("How are you ");
    expect(sanitizeProfileText("hello <there>")).toBe("hello there");
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

  it("allows only supported disappearing-message timers", () => {
    expect(conversationSettingsSchema.safeParse({ action: "timer", conversationId: "demo-chat", hours: 6 }).success).toBe(true);
    expect(conversationSettingsSchema.safeParse({ action: "timer", conversationId: "demo-chat", hours: 24 }).success).toBe(false);
    expect(conversationSettingsSchema.safeParse({ action: "read", conversationId: "demo-chat", messageId: "message-1" }).success).toBe(true);
  });

  it("validates sender message mutations", () => {
    expect(messageMutationSchema.safeParse({ action: "edit", messageId: "message-1", text: "Updated reply" }).success).toBe(true);
    expect(messageMutationSchema.safeParse({ action: "unsend", messageId: "message-1" }).success).toBe(true);
    expect(messageMutationSchema.safeParse({ action: "react", messageId: "message-1", emoji: "❤️" }).success).toBe(true);
    expect(messageMutationSchema.safeParse({ action: "react", messageId: "message-1", emoji: "💩" }).success).toBe(false);
  });
});
