import { describe, expect, it } from "vitest";
import { PERSONAS, personaById, pickPersona, temperOf } from "../personas";

describe("bot personas", () => {
  it("has six distinct personas across the three tempers", () => {
    expect(PERSONAS).toHaveLength(6);
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(6);
    expect(new Set(PERSONAS.map((p) => p.temper))).toEqual(
      new Set(["CAUTIOUS", "STEADY", "RECKLESS"]),
    );
    expect(personaById("rita")?.name).toBe("Reckless Rita");
  });

  it("reads a player's temper, steady by default, and picks a fresh persona", () => {
    const players = [
      { email: "a" },
      { email: "Bot #1", persona: "rita" },
      { email: "Bot #2", persona: "nobody" },
    ];
    expect(temperOf(players, "Bot #1")).toBe("RECKLESS");
    expect(temperOf(players, "Bot #2")).toBe("STEADY");
    expect(temperOf(players, "a")).toBe("STEADY");
    const taken = PERSONAS.slice(1).map((p) => p.id);
    expect(pickPersona(taken, () => 0.99).id).toBe(PERSONAS[0].id);
    expect(PERSONAS.map((p) => p.id)).toContain(
      pickPersona(
        PERSONAS.map((p) => p.id),
        () => 0.5,
      ).id,
    );
  });
});
