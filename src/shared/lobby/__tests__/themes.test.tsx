import { MantineProvider } from "@mantine/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LobbyTheme } from "../theme";
import acquire from "../../../acquire/lobbyTheme";
import clans from "../../../clans/lobbyTheme";
import condottiere from "../../../condottiere/lobbyTheme";
import coralReef from "../../../coral-reef/lobbyTheme";
import dvonn from "../../../dvonn/lobbyTheme";
import ecosystem from "../../../ecosystem/lobbyTheme";
import familyInc from "../../../family-inc/lobbyTheme";
import forSale from "../../../for-sale/lobbyTheme";
import fujiFlush from "../../../fuji-flush/lobbyTheme";
import gipf from "../../../gipf/lobbyTheme";
import highSociety from "../../../high-society/lobbyTheme";
import lyngk from "../../../lyngk/lobbyTheme";
import medici from "../../../medici/lobbyTheme";
import noThanks from "../../../no-thanks/lobbyTheme";
import razzia from "../../../razzia/lobbyTheme";
import rideTheRails from "../../../ride-the-rails/lobbyTheme";
import savanna from "../../../savanna/lobbyTheme";
import shangriLa from "../../../shangri-la/lobbyTheme";
import tigris from "../../../tigris/lobbyTheme";
import twixt from "../../../twixt/lobbyTheme";
import yinsh from "../../../yinsh/lobbyTheme";
import zertz from "../../../zertz/lobbyTheme";

const THEMES: { [name: string]: LobbyTheme } = {
  acquire,
  clans,
  condottiere,
  coralReef,
  dvonn,
  ecosystem,
  familyInc,
  forSale,
  fujiFlush,
  gipf,
  highSociety,
  lyngk,
  medici,
  noThanks,
  razzia,
  rideTheRails,
  savanna,
  shangriLa,
  tigris,
  twixt,
  yinsh,
  zertz,
};

afterEach(cleanup);

describe("lobby themes", () => {
  it("every game's banner renders and its theme is complete", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      expect(theme.accent, name).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.background.length, name).toBeGreaterThan(10);
      expect(theme.flavour.length, name).toBeGreaterThan(20);
      expect(theme.seatIcons.length, name).toBeGreaterThan(1);
      const { container, unmount } = render(
        <MantineProvider>{theme.banner}</MantineProvider>,
      );
      const fan = container.querySelector("[class*=banner]");
      expect(fan?.children.length ?? 0, name).toBeGreaterThan(4);
      unmount();
    }
  });
});
