import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import TileIcon from "./game/components/TileIcon";
import type { Colour } from "@games/tigris/types";

const SHOWN: Colour[] = [
  "RED",
  "BLUE",
  "GREEN",
  "BLACK",
  "RED",
  "GREEN",
  "BLUE",
];

/** The two rivers: temples, farms, markets and settlements laid along the banks. */
const tigrisLobby: LobbyTheme = {
  accent: "#d9a35a",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(217, 163, 90, 0.22), transparent 60%), linear-gradient(180deg, rgba(92, 64, 36, 0.92), rgba(30, 20, 12, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c, i) => (
        <TileIcon key={i} colour={c} size={48} />
      ))}
    />
  ),
  flavour:
    "Place tiles, seat your leaders, and grow kingdoms along the rivers. Your score is your weakest colour.",
  seatIcons: ["🏺", "🦁", "🏹", "🐂"],
  botIcon: "🤖",
};

export default tigrisLobby;
