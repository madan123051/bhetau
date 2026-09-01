import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatsList, type ChatListItem } from "./chats-list";

const conversation: ChatListItem = {
  id: "conversation-1",
  profileId: "profile-1",
  firstName: "Aashika",
  city: "Kathmandu",
  verified: true,
  lastMessage: "Coffee this weekend?",
  timestamp: "now",
  timestampIso: "2026-09-01T00:00:00.000Z",
  unread: 0,
  matchedAt: "2026-09-01T00:00:00.000Z",
  hasMessages: true,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("chat removal safety", () => {
  it("asks for confirmation before hiding a conversation", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const user = userEvent.setup();

    render(<ChatsList initialItems={[conversation]} />);
    await user.click(screen.getByRole("button", { name: "Review removal of conversation with Aashika" }));

    expect(screen.getByRole("dialog", { name: "Hide chat with Aashika?" })).toBeInTheDocument();
    expect(screen.getByText(/You stay matched, and existing messages remain saved/)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep chat" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getAllByRole("link", { name: "Open chat with Aashika" })).toHaveLength(2);
  });

  it("hides only after explicit confirmation", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", request);
    const user = userEvent.setup();

    render(<ChatsList initialItems={[conversation]} />);
    await user.click(screen.getByRole("button", { name: "Review removal of conversation with Aashika" }));
    await user.click(screen.getByRole("button", { name: "Hide chat" }));

    expect(request).toHaveBeenCalledWith("/api/conversations", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ action: "archive", conversationId: "conversation-1" }),
    }));
    expect(await screen.findByText("Chat hidden. Your match and messages are still safe.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open chat with Aashika" })).not.toBeInTheDocument();
  });
});
