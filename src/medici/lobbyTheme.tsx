import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";

const SHOWN = [
  "CLOTH_5",
  "SPICE_3",
  "GRAIN_4",
  "GOLD_10",
  "DYE_2",
  "FUR_5",
  "CLOTH_0",
];

/** The wholesale market: a lot of every commodity, and the gold, over the harbour. */
const mediciLobby: LobbyTheme = {
  accent: "#f2c25c",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(242, 194, 92, 0.22), transparent 60%), linear-gradient(180deg, rgba(29, 42, 68, 0.94), rgba(10, 14, 26, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c) => (
        <CardFace key={c} card={c} width={46} decorative />
      ))}
    />
  ),
  flavour:
    "Three days of auctions. Fill your ship, corner a commodity, and remember that every florin spent is a point lost.",
  seatIcons: ["⛵", "🧵", "🌶", "🌾", "🫙", "🦊"],
  botIcon: "🤖",
};

export default mediciLobby;
