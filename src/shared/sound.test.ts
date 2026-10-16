import { describe, expect, it } from "vitest";
import { isMuted, setMuted, soundForEvent } from "./sound";

describe("soundForEvent", () => {
  it("maps server events from all three games", () => {
    expect(soundForEvent("alice has highest bid of 10.")).toBe("bid");
    expect(soundForEvent("alice won 7 for a total of 10.")).toBe("win");
    expect(soundForEvent("bob passes and receives -5.")).toBe("alarm");
    expect(soundForEvent("bob passed.")).toBe("pass");
    expect(soundForEvent("bob has placed a chip on 35.")).toBe("chip");
    expect(soundForEvent("bob has taken the 35 along with 2 chips.")).toBe(
      "win",
    );
    expect(soundForEvent("p1 revealed COINS.")).toBe("card");
    expect(soundForEvent("p1 drew a police raid (2 of 7).")).toBe("alarm");
    expect(soundForEvent("p1 called an auction.")).toBe("bid");
    expect(soundForEvent("Round 1 is over. Round 2 begins.")).toBe("fanfare");
    expect(soundForEvent("Round 3 is over. Game over.")).toBe("fanfare");
    expect(soundForEvent("Something else entirely")).toBeNull();
  });
});

describe("mute", () => {
  it("persists the choice", () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });
});
