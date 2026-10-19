import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";
import { CARD_TYPES } from "./game/board";

/** Deep water: the reef's cards fanned under shafts of light. */
const coralReefLobby: LobbyTheme = {
  accent: "#4cc9f0",
  background:
    "radial-gradient(ellipse at 30% -10%, rgba(140, 230, 255, 0.25), transparent 55%), radial-gradient(ellipse at 75% 0%, rgba(76, 201, 240, 0.18), transparent 50%), linear-gradient(180deg, rgba(10, 58, 110, 0.85), rgba(3, 22, 48, 0.96))",
  banner: (
    <BannerFan
      cards={CARD_TYPES.map((t) => (
        <CardFace key={t} type={t} size={46} />
      ))}
    />
  ),
  flavour:
    "Sharks hunt, whales sieve the krill, and the octopus slips a card away. Draft the reef that feeds itself.",
  seatIcons: ["🐠", "🐙", "🦈", "🐢", "🦀", "🐋", "🦐"],
  botIcon: "🤖",
};

export default coralReefLobby;
