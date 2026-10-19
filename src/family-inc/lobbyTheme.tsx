import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import Chip from "./game/components/Chip";
import { CHIP_VALUES } from "@games/family-inc/types";

const SHOWN = CHIP_VALUES.filter((_, i) => i % 2 === 1 || i === 0);

/** The family table: a run of chips over green baize. */
const familyIncLobby: LobbyTheme = {
  accent: "#49b46a",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(73, 180, 106, 0.22), transparent 60%), linear-gradient(180deg, rgba(18, 66, 38, 0.92), rgba(8, 26, 16, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((v) => (
        <Chip key={v} value={v} size={50} />
      ))}
    />
  ),
  flavour:
    "Draw chips while your nerve holds. Draw a value you already have and the whole turn goes to the family.",
  seatIcons: ["🎩", "💼", "🥃", "💵", "🚬", "🃏", "🎰"].map((s) =>
    s === "🚬" ? "🕶️" : s,
  ),
  botIcon: "🤖",
};

export default familyIncLobby;
