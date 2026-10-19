import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";

const SHOWN = [2, 5, 8, 11, 14, 17, 20];

/** The mountain climbs with the numbers, from summer meadows to the night summit. */
const fujiFlushLobby: LobbyTheme = {
  accent: "#6fb3d6",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(111, 179, 214, 0.22), transparent 60%), linear-gradient(180deg, rgba(34, 37, 77, 0.94), rgba(12, 13, 30, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c) => (
        <CardFace key={c} card={c} width={46} decorative />
      ))}
    />
  ),
  flavour:
    "Higher numbers flush lower ones down the drain; equal numbers join forces. First to push every card through wins.",
  seatIcons: ["🗻", "🚽", "🌊", "🏔️", "🌸", "🎋", "🍜", "⛩️"],
  botIcon: "🤖",
};

export default fujiFlushLobby;
