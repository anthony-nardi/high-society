import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import LinkCard from "./game/components/LobbyArt";

/** Pegs and links reaching across the board. */
const twixtLobby: LobbyTheme = {
  accent: "#d13b2f",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(209, 59, 47, 0.2), transparent 60%), linear-gradient(180deg, rgba(64, 52, 36, 0.94), rgba(22, 18, 12, 0.98))",
  banner: (
    <BannerFan
      cards={[
        <LinkCard key="1" colour="red" />,
        <LinkCard key="2" colour="black" linked={false} />,
        <LinkCard key="3" colour="red" />,
        <LinkCard key="4" colour="black" />,
        <LinkCard key="5" colour="red" linked={false} />,
        <LinkCard key="6" colour="black" />,
        <LinkCard key="7" colour="red" />,
      ]}
    />
  ),
  flavour:
    "Peg a hole, link it a knight's move away, and bridge your two sides before your opponent bridges theirs.",
  seatIcons: ["🔴", "⚫"],
  botIcon: "🤖",
};

export default twixtLobby;
