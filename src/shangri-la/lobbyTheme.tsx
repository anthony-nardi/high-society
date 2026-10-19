import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import VillageCard from "./game/components/LobbyArt";

/** Villages in the mist, the rope bridges between them. */
const shangriLaLobby: LobbyTheme = {
  accent: "#e0a56b",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(224, 165, 107, 0.2), transparent 60%), linear-gradient(180deg, rgba(52, 70, 84, 0.94), rgba(18, 24, 30, 0.98))",
  banner: (
    <BannerFan
      cards={[
        <VillageCard key="1" seat={0} students={2} />,
        <VillageCard key="2" seat={1} />,
        <VillageCard key="3" seat={2} students={1} />,
        <VillageCard key="4" seat={3} students={3} />,
        <VillageCard key="5" seat={0} />,
        <VillageCard key="6" seat={1} students={2} />,
      ]}
    />
  ),
  flavour:
    "Seat your masters, send students over the bridges, and watch the bridges fall behind them.",
  seatIcons: ["🧘", "🏯", "🌉", "🪷"],
  botIcon: "🤖",
};

export default shangriLaLobby;
