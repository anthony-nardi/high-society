import type { ReactNode } from "react";

/**
 * How a game dresses its lobby. Games without a theme get the plain look.
 * The banner is drawn above the seats, the flavour line under it, and the
 * seats take their icons from the theme in order.
 */
export type LobbyTheme = {
  /** Colour of the ready button, the borders and the glow. */
  accent: string;
  /** Background of the lobby card, any CSS background. */
  background: string;
  /** Decorative art across the top of the lobby. */
  banner: ReactNode;
  /** One line of flavour under the banner. */
  flavour: string;
  /** Icons for the seats, by seat index; the list wraps round. */
  seatIcons: string[];
  /** Icon for a bot's seat. */
  botIcon?: string;
};
