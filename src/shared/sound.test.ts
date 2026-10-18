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
    expect(
      soundForEvent("a busted on a 7 after 2 draws and receives a diamond."),
    ).toBe("alarm");
    expect(
      soundForEvent("a stops with 12 points of chips and steals 2×4 from b."),
    ).toBe("win");
    expect(
      soundForEvent("a jumps 1,3 to 3,3 and captures a white marble."),
    ).toBe("stoneJump");
    expect(soundForEvent("a places a gray marble on 4,3.")).toBe("stonePlace");
    expect(soundForEvent("a removes ring 4,0.")).toBe("stoneLift");
    expect(soundForEvent("a isolates 2 marbles and takes white, gray.")).toBe(
      "stoneClatter",
    );
    expect(soundForEvent("a places a white ring on 5,5.")).toBe("stonePlace");
    expect(soundForEvent("a moves a ring 5,5 to 5,2.")).toBe("stoneSlide");
    expect(
      soundForEvent("a moves a ring 5,5 to 5,2 and flips 2 markers."),
    ).toBe("stoneFlip");
    expect(soundForEvent("a removes a row of five white markers.")).toBe(
      "stoneClatter",
    );
    expect(soundForEvent("a removes a ring and has 1 of 3.")).toBe(
      "stoneScore",
    );
    expect(soundForEvent("a places a DVONN piece on 5,2.")).toBe("stonePlace");
    expect(soundForEvent("a moves a stack of 2 from 3,2 to 5,2.")).toBe(
      "stoneSlide",
    );
    expect(
      soundForEvent(
        "a moves a stack of 1 from 3,2 to 4,2. 2 stacks lost contact with the DVONN pieces and are removed.",
      ),
    ).toBe("stoneClatter");
    expect(soundForEvent("b cannot move and passes.")).toBe("pass");
    expect(
      soundForEvent(
        "a pushes a white piece in at 1,4, shoving 2 pieces along.",
      ),
    ).toBe("stoneSlide");
    expect(
      soundForEvent("a takes a row of 6: 4 back to reserve, 2 captured."),
    ).toBe("stoneClatter");
    expect(soundForEvent("a claims red.")).toBe("bid");
    expect(
      soundForEvent("a moves a stack of 2 from 0,4 to 3,4 via 1 LYNGK link."),
    ).toBe("stoneSlide");
    expect(
      soundForEvent(
        "a moves a stack of 1 from 0,4 to 1,4. A stack of five is complete: a scores it (1).",
      ),
    ).toBe("stoneScore");
    expect(soundForEvent("a bids $3,000.")).toBe("bid");
    expect(soundForEvent("a passes and takes #4 for $2,000.")).toBe("pass");
    expect(soundForEvent("a wins #25 for $5,000.")).toBe("win");
    expect(soundForEvent("Sold: a #30 for $15,000; b #2 for $0.")).toBe("card");
    expect(soundForEvent("a places a yeti-whisperer master in Tashi.")).toBe(
      "stonePlace",
    );
    expect(soundForEvent("a recruits a healer student in Tashi.")).toBe("chip");
    expect(
      soundForEvent(
        "a sends the students of Tashi to Nyima: 2 travel, 1 become masters. The bridge breaks.",
      ),
    ).toBe("stoneSlide");
    expect(soundForEvent("a plays 5E.")).toBe("chip");
    expect(
      soundForEvent("a founds Tower with 2 tiles and takes a founder's share."),
    ).toBe("win");
    expect(soundForEvent("Luxor takes over Imperial.")).toBe("fanfare");
    expect(soundForEvent("a buys 2 Tower, 1 Luxor for $600.")).toBe("card");
    expect(soundForEvent("a calls the armies to Roma.")).toBe("fanfare");
    expect(soundForEvent("a plays mercenary 6.")).toBe("card");
    expect(soundForEvent("a plays Winter: every mercenary counts 1.")).toBe(
      "alarm",
    );
    expect(soundForEvent("a wins Roma with 12. a holds the Condottiere.")).toBe(
      "win",
    );
    expect(soundForEvent("a takes a Red share.")).toBe("card");
    expect(soundForEvent("a lays Blue track in Boston.")).toBe("stonePlace");
    expect(
      soundForEvent("a carries a passenger from Boston to Albany for $3."),
    ).toBe("train");
    expect(soundForEvent("Round 2 begins.")).toBe("turn");
    expect(soundForEvent("a moves 3 huts into forest.")).toBe("stoneSlide");
    expect(soundForEvent("a pegs K11.")).toBe("stonePlace");
    expect(soundForEvent("Pick 3 placed. Hands pass left.")).toBe("card");
    expect(soundForEvent("a pegs M12 and links 2.")).toBe("stoneSlide");
    expect(soundForEvent("b swaps sides and takes Red.")).toBe("alarm");
    expect(
      soundForEvent("a moves 1 hut into steppe and founds a village."),
    ).toBe("win");
    expect(
      soundForEvent(
        "Village 3 in forest is razed: forest is forbidden in epoch 4.",
      ),
    ).toBe("alarm");
    expect(soundForEvent("a wins!")).toBe("fanfare");
    expect(soundForEvent("The game is a draw.")).toBe("fanfare");
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
