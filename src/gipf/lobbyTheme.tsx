import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import PieceCard from "./game/components/LobbyArt";

/** Pieces pushed in from the edge, the doubled GIPF pieces among them. */
const gipfLobby: LobbyTheme = {
  accent: "#9fb3c8",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(159, 179, 200, 0.18), transparent 60%), linear-gradient(180deg, rgba(36, 42, 54, 0.94), rgba(14, 16, 22, 0.98))",
  banner: (
    <BannerFan
      cards={[
        <PieceCard key="1" colour="white" />,
        <PieceCard key="2" colour="black" />,
        <PieceCard key="3" colour="white" gipf />,
        <PieceCard key="4" colour="black" gipf />,
        <PieceCard key="5" colour="white" gipf />,
        <PieceCard key="6" colour="black" />,
        <PieceCard key="7" colour="white" />,
      ]}
    />
  ),
  flavour:
    "Push a piece in from the edge and the row shifts along. Four in a line come back to your reserve; run out and you lose.",
  seatIcons: ["⚪", "⚫"],
  botIcon: "🤖",
};

export default gipfLobby;
