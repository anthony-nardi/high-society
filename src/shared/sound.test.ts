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
    expect(soundForEvent("a drew a 7.")).toBe("chip");
    expect(soundForEvent("a busted on a 7 after 2 draws and receives a diamond.")).toBe("alarm");
    expect(soundForEvent("a stops with 12 points of chips and steals 2×4 from b.")).toBe("win");
    expect(soundForEvent("a jumps 1,3 to 3,3 and captures a white marble.")).toBe("win");
    expect(soundForEvent("a places a gray marble on 4,3.")).toBe("chip");
    expect(soundForEvent("a removes ring 4,0.")).toBe("card");
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
