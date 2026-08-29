import { describe, expect, it } from "vitest";
import { dateOfBirthSchema, sanitizeProfileText } from "./schemas";

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
});
