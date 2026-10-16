import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
      <ConnectedPlayersCount players={players} gameName="high-society" />,
    );
    expect(highSociety.container.textContent).toContain("2 / 5 players");
    expect(highSociety.container.textContent).toContain("Need 1 more to start");
    highSociety.unmount();

    const noThanks = renderWithMantine(
      <ConnectedPlayersCount
        players={[...players, { email: "carol@example.com", ready: false }]}
        gameName="no-thanks"
      />,
    );
    expect(noThanks.container.textContent).toContain("3 / 7 players");
    expect(noThanks.container.textContent).toContain(
      "Starts when everyone is ready",
    );
  });
});

describe("PlayersList", () => {
  it("lists every player by display name with their ready state", () => {
    renderWithMantine(
      <PlayersList
        players={[
          { email: "alice@example.com", ready: true },
          { email: "bob@example.com", ready: false },
        ]}
      />,
    );

    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("Waiting")).toBeTruthy();
  });

  it("marks bots and lets them be removed", () => {
    const onRemoveBot = vi.fn();
    renderWithMantine(
      <PlayersList
        players={[
          { email: "alice@example.com", ready: true },
          { email: "Bot #1", ready: true, isBot: true },
        ]}
        onRemoveBot={onRemoveBot}
      />,
    );

    expect(screen.getByText("Bot 1")).toBeTruthy();
    expect(screen.getByText("Bot")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Bot 1" }));
    expect(onRemoveBot).toHaveBeenCalledWith("Bot #1");
    expect(screen.queryByRole("button", { name: /Remove alice/ })).toBeNull();
  });
});
