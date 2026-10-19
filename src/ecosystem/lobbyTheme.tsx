import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";
import { CARD_TYPES } from "./game/board";

/** The forest and meadow: every card of the deck fanned over a green glade. */
const ecosystemLobby: LobbyTheme = {
  accent: "#7ccf7a",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(124, 207, 122, 0.22), transparent 60%), linear-gradient(180deg, rgba(28, 64, 36, 0.85), rgba(14, 30, 20, 0.95))",
  banner: (
    <BannerFan
      cards={CARD_TYPES.map((t) => (
        <CardFace key={t} type={t} size={46} />
      ))}
    />
  ),
  flavour:
    "Eleven cards each. Keep one, pass the rest, and build a wild where everything feeds something.",
  seatIcons: ["🐻", "🦊", "🐺", "🦌", "🐝", "🐰", "🦅"],
  botIcon: "🤖",
};

export default ecosystemLobby;
