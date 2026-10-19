import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFace from "./game/components/CardFace";

const SHOWN = [
  "RED_6",
  "BLUE_5",
  "DICE",
  "YELLOW_4",
  "SWITCH",
  "GREEN_3",
  "PURPLE_2",
];

/** The table at its most tempting: a run of colours, a dice card, and a switch. */
const pushLobby: LobbyTheme = {
  accent: "#e8c23a",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(232, 194, 58, 0.2), transparent 60%), linear-gradient(180deg, rgba(40, 24, 56, 0.92), rgba(14, 8, 22, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((c) => (
        <CardFace key={c} card={c} width={46} decorative />
      ))}
    />
  ),
  flavour:
    "Turn cards over into three columns, stop before one fits nowhere, and protect your colours before the die finds them.",
  seatIcons: ["🎲", "🔺", "🟦", "🟡", "🔷", "⭐"],
  botIcon: "🤖",
};

export default pushLobby;
