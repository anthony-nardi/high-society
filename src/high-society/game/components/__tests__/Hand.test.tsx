import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Hand from "../Hand";

afterEach(cleanup);

describe("Hand", () => {
  it("renders every card in ascending order", () => {
    render(
      <Hand cards={["25", "1", "10"]} selected={[]} onToggle={() => {}} />,
    );

    const labels = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual(["Money card 1", "Money card 10", "Money card 25"]);
  });

  it("reports clicks and marks selected cards as pressed", () => {
    const onToggle = vi.fn();
    render(<Hand cards={["1", "2"]} selected={["2"]} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Money card 1" }));

    expect(onToggle).toHaveBeenCalledWith("1");
    expect(
      screen
        .getByRole("button", { name: "Money card 2" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Money card 1" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("ignores clicks while disabled", () => {
    const onToggle = vi.fn();
    render(<Hand cards={["1"]} selected={[]} onToggle={onToggle} disabled />);

    fireEvent.click(screen.getByRole("button", { name: "Money card 1" }));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
