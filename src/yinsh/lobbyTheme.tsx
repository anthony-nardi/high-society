import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import RingCard from "./game/components/LobbyArt";

/** Rings and the markers they leave behind, over the wooden board. */
const yinshLobby: LobbyTheme = {
  accent: "#e9dcc2",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(233, 220, 194, 0.16), transparent 60%), linear-gradient(180deg, rgba(74, 54, 36, 0.94), rgba(28, 20, 14, 0.98))",
  banner: (
    <BannerFan
      cards={[
        <RingCard key="1" ring="white" />,
        <RingCard key="2" ring="white" marker="white" />,
        <RingCard key="3" ring="black" marker="black" />,
        <RingCard key="4" ring="white" marker="black" />,
        <RingCard key="5" ring="black" marker="white" />,
        <RingCard key="6" ring="black" marker="black" />,
        <RingCard key="7" ring="black" />,
      ]}
    />
  ),
  flavour:
    "Every move leaves a marker and flips the ones it jumps. Five in a row costs you a ring, and three rings lost wins.",
  seatIcons: ["⚪", "⚫"],
  botIcon: "🤖",
};

export default yinshLobby;
