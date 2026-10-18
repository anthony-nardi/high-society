import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FanHand from "../FanHand";

afterEach(cleanup);

const items = [
  { key: "a", label: "Card A", node: <span>A</span> },
  { key: "b", label: "Card B", node: <span>B</span> },
  { key: "c", label: "Card C", node: <span>C</span>, disabled: true },
];

describe("FanHand", () => {
  it("renders every card and marks the tray", () => {
    render(
      <FanHand
        items={items}
        selected={["b"]}
        onToggle={() => {}}
        trayLabel="To play"
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen
        .getByRole("button", { name: "Card B" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("To play")).toBeTruthy();
  });

  it("reports taps and ignores disabled cards", () => {
    const onToggle = vi.fn();
    render(<FanHand items={items} selected={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Card A" }));
    fireEvent.click(screen.getByRole("button", { name: "Card C" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("a");
  });
});
