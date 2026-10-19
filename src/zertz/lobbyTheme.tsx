import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import MarbleCard from "./game/components/LobbyArt";
import type { Colour } from "./game/types";

const SHOWN: Colour[] = [
  "WHITE",
  "GRAY",
  "BLACK",
  "WHITE",
  "BLACK",
  "GRAY",
  "WHITE",
];

/** The last rings: marbles over slate. */
const zertzLobby: LobbyTheme = {
  accent: "#b8c2d4",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(184, 194, 212, 0.18), transparent 60%), linear-gradient(180deg, rgba(40, 46, 58, 0.94), rgba(16, 18, 24, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c, i) => (
        <MarbleCard key={i} colour={c} />
      ))}
    />
  ),
  flavour:
    "Place a marble, take a ring away. The board shrinks until every jump is forced and every capture counts.",
  seatIcons: ["⚪", "⚫"],
  botIcon: "🤖",
};

export default zertzLobby;
