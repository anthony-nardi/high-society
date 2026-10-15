import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ConnectedPlayersCount from "../ConnectedPlayersCount";
import PlayersList from "../PlayersList";

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

afterEach(cleanup);

describe("ConnectedPlayersCount", () => {
  it("shows the player count against the game's maximum", () => {
    const players = [
      { email: "alice@example.com", ready: true },
      { email: "bob@example.com", ready: false },
    ];

    const highSociety = renderWithMantine(
      <ConnectedPlayersCount players={players} gameName="high-society" />
    );
    expect(highSociety.container.textContent).toContain("2 / 5");
    highSociety.unmount();

    const noThanks = renderWithMantine(
      <ConnectedPlayersCount players={players} gameName="no-thanks" />
    );
    expect(noThanks.container.textContent).toContain("2 / 7");
  });
});

describe("PlayersList", () => {
  it("lists every player with their ready state", () => {
    renderWithMantine(
      <PlayersList
        players={[
          { email: "alice@example.com", ready: true },
          { email: "bob@example.com", ready: false },
        ]}
      />
    );

    expect(screen.getByText("alice@example.com")).toBeTruthy();
    expect(screen.getByText("bob@example.com")).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("Not Ready")).toBeTruthy();
  });
});
