import type { CSSProperties } from "react";
import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import CardFront from "./card/CardFront";

const SHOWN = ["1", "3", "5", "7", "10", "2x", "1/2"];

/** The salon: luxuries, recognition and a mansion fire fanned over velvet. */
const highSocietyLobby: LobbyTheme = {
  accent: "#d4af37",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(212, 175, 55, 0.22), transparent 60%), linear-gradient(180deg, rgba(74, 18, 40, 0.9), rgba(28, 8, 18, 0.97))",
  banner: (
    <BannerFan
      cards={SHOWN.map((card) => (
        <div key={card} style={{ "--hs-deck-card-w": "46px" } as CSSProperties}>
          <CardFront card={card} size="lg" />
        </div>
      ))}
    />
  ),
  flavour:
    "Spend lavishly on status, but not too lavishly: the poorest guest is shown the door before the scores are read.",
  seatIcons: ["🎩", "👒", "💎", "🍾", "🎻", "🪞", "🕯️"],
  botIcon: "🤖",
};

export default highSocietyLobby;
