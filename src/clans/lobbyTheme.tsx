import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import HutCard from "./game/components/LobbyArt";

/** Huts drawing together into villages across the five landscapes. */
const clansLobby: LobbyTheme = {
  accent: "#a3d977",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(163, 217, 119, 0.2), transparent 60%), linear-gradient(180deg, rgba(40, 64, 34, 0.94), rgba(14, 24, 12, 0.98))",
  banner: (
    <BannerFan
      cards={[
        <HutCard key="1" clan={0} />,
        <HutCard key="2" clan={1} huts={2} />,
        <HutCard key="3" clan={2} />,
        <HutCard key="4" clan={3} huts={3} />,
        <HutCard key="5" clan={4} huts={2} />,
        <HutCard key="6" clan={0} huts={3} />,
        <HutCard key="7" clan={1} />,
      ]}
    />
  ),
  flavour:
    "Nobody knows which clan is yours. Move huts together until a village is cut off, and let the colours tell.",
  seatIcons: ["🛖", "🌲", "🏔️", "🌾"],
  botIcon: "🤖",
};

export default clansLobby;
