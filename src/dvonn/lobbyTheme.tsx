import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import StackCard from "./game/components/LobbyArt";

const SHOWN = ["w", "bw", "d", "wwb", "bbbw", "wd", "b"];

/** Stacks growing across the board, the red dvonn pieces holding it together. */
const dvonnLobby: LobbyTheme = {
  accent: "#d13b2f",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(209, 59, 47, 0.22), transparent 60%), linear-gradient(180deg, rgba(48, 34, 30, 0.94), rgba(18, 12, 12, 0.98))",
  banner: (
    <BannerFan
      cards={SHOWN.map((p, i) => (
        <StackCard key={i} pieces={p} />
      ))}
    />
  ),
  flavour:
    "Stack to capture, but keep every stack in touch with a red piece: whatever loses contact leaves the board.",
  seatIcons: ["⚪", "⚫"],
  botIcon: "🤖",
};

export default dvonnLobby;
