import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";
import type { Card } from "@games/condottiere/types";

const SHOWN: Card[] = [
  "M10",
  "DRUMMER",
  "HEROINE",
  "WINTER",
  "SPRING",
  "BISHOP",
  "SCARECROW",
  "SURRENDER",
  "COURTESAN",
];

/** The condottiere's tent: mercenaries and the cards that turn a battle. */
const condottiereLobby: LobbyTheme = {
  accent: "#c9342b",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(201, 52, 43, 0.24), transparent 60%), linear-gradient(180deg, rgba(64, 26, 22, 0.92), rgba(22, 10, 8, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c) => (
        <CardFace key={c} card={c} width={46} />
      ))}
    />
  ),
  flavour:
    "Hire mercenaries, fight for the cities of Italy one battle at a time, and know when to surrender.",
  seatIcons: ["⚔️", "🛡️", "🏰", "🐎", "👑", "🎺"],
  botIcon: "🤖",
};

export default condottiereLobby;
