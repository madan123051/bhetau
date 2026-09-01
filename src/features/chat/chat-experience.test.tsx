import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MayaProvider } from "@/features/maya/maya-provider";
import type { Profile } from "@/types/domain";
import { ChatExperience } from "./chat-experience";

vi.mock("next/navigation", () => ({ usePathname: () => "/chats/rohan" }));

const profile: Profile = {
  id: "rohan",
  firstName: "Rohan",
  age: 27,
  verified: true,
  city: "Around Patan",
  from: "Pokhara",
  occupation: "Designer",
  intent: "Long-term relationship",
  interests: ["Coffee", "Trekking"],
  languages: ["नेपाली", "English"],
  lifestyle: ["Non-smoker"],
  prompt: "Perfect Saturday",
  answer: "A long walk and good coffee.",
  bio: "A fictional test profile.",
  promptAffinity: 0.8,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});

describe("chat overlays", () => {
  it("keeps Maya floating while the safety menu is open and layers the menu above messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ preferences: { enabled: true } }) }));
    const user = userEvent.setup();
    render(<MayaProvider><ChatExperience profile={profile} conversationId="conversation-1"/></MayaProvider>);

    expect(screen.getByRole("button", { name: "Open Maya AI assistant" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Open safety menu" }));

    expect(screen.getByRole("button", { name: "Open Maya AI assistant" })).toBeVisible();
    expect(screen.getByRole("banner")).toHaveClass("z-50");
    expect(screen.getByText("Safety center")).toBeVisible();
  });
});
