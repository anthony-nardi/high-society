import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import NumberCard from "./game/components/LobbyArt";

const SHOWN: [number, number][] = [
  [3, 0],
  [9, 2],
  [14, 0],
  [20, 4],
  [26, 1],
  [31, 3],
  [35, 0],
];

/** The deal: a run of cards, some sweetened with chips, over a red felt. */
const noThanksLobby: LobbyTheme = {
  accent: "#e05252",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(224, 82, 82, 0.25), transparent 60%), linear-gradient(180deg, rgba(96, 22, 30, 0.9), rgba(36, 8, 12, 0.97))",
  banner: (
    <BannerFan
      cards={SHOWN.map(([value, chips]) => (
        <NumberCard key={value} value={value} chips={chips} />
      ))}
    />
  ),
  flavour:
    "Pay a chip to pass, or take the card and every chip on it. Runs are cheap; gaps are not.",
  seatIcons: ["🙅", "🤷", "🪙", "😬", "🙈", "🫣", "🙃"],
  botIcon: "🤖",
};

export default noThanksLobby;
