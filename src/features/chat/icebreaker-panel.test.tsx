import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IcebreakerPanel } from "./icebreaker-panel";

afterEach(cleanup);

describe("IcebreakerPanel", () => {
  it("stays compact until the user expands it", async () => {
    const user = userEvent.setup();
    render(<IcebreakerPanel onUse={vi.fn()}/>);

    const trigger = screen.getByRole("button", { name: /editable icebreaker/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: "Edit icebreaker" })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "Edit icebreaker" })).toBeInTheDocument();
  });

  it("passes the editable text into the chat composer and collapses", async () => {
    const onUse = vi.fn();
    const user = userEvent.setup();
    render(<IcebreakerPanel onUse={onUse}/>);

    await user.click(screen.getByRole("button", { name: /editable icebreaker/i }));
    const input = screen.getByRole("textbox", { name: "Edit icebreaker" });
    await user.clear(input);
    await user.type(input, "Which trail would you repeat?");
    await user.click(screen.getByRole("button", { name: "Use in message" }));

    expect(onUse).toHaveBeenCalledWith("Which trail would you repeat?");
    expect(screen.getByRole("button", { name: /editable icebreaker/i })).toHaveAttribute("aria-expanded", "false");
  });
});
