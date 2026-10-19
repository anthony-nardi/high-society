import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import { CHAINS } from "./game/board";
import ChainCard from "./game/components/ChainCard";

/** The boardroom: the seven chains' certificates fanned over a gridded navy board. */
const acquireLobby: LobbyTheme = {
  accent: "#e8c23a",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(232, 194, 58, 0.18), transparent 60%), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 22px), linear-gradient(180deg, rgba(29, 34, 48, 0.96), rgba(16, 19, 28, 0.98))",
  banner: (
    <BannerFan
      cards={CHAINS.map((c) => (
        <ChainCard key={c} chain={c} />
      ))}
    />
  ),
  flavour:
    "Lay tiles, found hotel chains, and hold the right shares when the mergers come.",
  seatIcons: ["🎩", "💼", "🏨", "🏦", "🧳", "🏢"],
  botIcon: "🤖",
};

export default acquireLobby;
