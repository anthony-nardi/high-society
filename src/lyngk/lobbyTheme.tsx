import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import StackCard from "./game/components/LobbyArt";

const SHOWN = ["r", "bg", "kw", "rgbik", "ib", "gw", "k"];

/** Stacks of five colours climbing towards a LYNGK. */
const lyngkLobby: LobbyTheme = {
  accent: "#c9b6ff",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(201, 182, 255, 0.2), transparent 60%), linear-gradient(180deg, rgba(38, 32, 56, 0.94), rgba(14, 12, 22, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((p, i) => (
        <StackCard key={i} pieces={p} />
      ))}
    />
  ),
  flavour:
    "Claim colours as you go and build stacks of all five. A finished stack is yours; the most finished stacks wins.",
  seatIcons: ["🔴", "🔵"],
  botIcon: "🤖",
};

export default lyngkLobby;
