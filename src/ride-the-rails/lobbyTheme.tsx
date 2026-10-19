import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import LocomotiveCard from "./game/components/LobbyArt";
import { COLOURS, RAILROADS } from "./game/board";

/** The roundhouse: six railroads' locomotives waiting for track. */
const rideTheRailsLobby: LobbyTheme = {
  accent: "#e9c832",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(233, 200, 50, 0.18), transparent 60%), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 14px), linear-gradient(180deg, rgba(60, 44, 30, 0.94), rgba(20, 14, 10, 0.98))",
  banner: (
    <BannerFan
      cards={RAILROADS.map((r) => (
        <LocomotiveCard key={r} colour={COLOURS[r]} />
      ))}
    />
  ),
  flavour:
    "Take a share, lay the track, then ride passengers across the map and pay every railroad they travel on.",
  seatIcons: ["🚂", "🎩", "🛤️", "🧳", "🚉"],
  botIcon: "🤖",
};

export default rideTheRailsLobby;
