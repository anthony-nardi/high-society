import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";
import { CARD_TYPES } from "./game/board";

/** Sunset on the Serengeti: the herds and the hunters fanned over the dust. */
const savannaLobby: LobbyTheme = {
  accent: "#e8a04a",
  background:
    "radial-gradient(ellipse at 50% -20%, rgba(255, 170, 70, 0.3), transparent 60%), linear-gradient(180deg, rgba(122, 56, 22, 0.85), rgba(46, 22, 12, 0.96))",
  banner: (
    <BannerFan
      cards={CARD_TYPES.map((t) => (
        <CardFace key={t} type={t} size={46} />
      ))}
    />
  ),
  flavour:
    "Giraffes by the trees, zebras on the grass, and lions waiting at the edge of it all. Draft the plains.",
  seatIcons: ["🦁", "🦒", "🐘", "🦓", "🐆", "🦌", "🦅"],
  botIcon: "🤖",
};

export default savannaLobby;
