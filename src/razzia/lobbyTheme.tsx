import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import LootCard from "./game/components/LootCard";
import { BUSINESSES, JEWELS } from "@games/razzia/types";

const SHOWN = [...JEWELS, ...BUSINESSES.slice(0, 3)];

/** The back room: jewels and rackets laid out under a single lamp. */
const razziaLobby: LobbyTheme = {
  accent: "#d4a52a",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(212, 165, 42, 0.22), transparent 55%), linear-gradient(180deg, rgba(40, 32, 24, 0.92), rgba(14, 11, 9, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c) => (
        <LootCard key={c} card={c} width={46} />
      ))}
    />
  ),
  flavour:
    "Loot piles up in the middle until somebody calls the auction, or the police come through the door.",
  seatIcons: ["🕶️", "🎩", "🍸", "💰", "🔦", "🚓", "🎲"],
  botIcon: "🤖",
};

export default razziaLobby;
