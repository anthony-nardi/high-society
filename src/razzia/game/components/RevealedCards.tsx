import useGameState from "../../../shared/hooks/useGameState";
import { LOOT_CARDS, RazziaGameState } from "../types";
import RevealedCard from "./RevealedCard";

export default function RevealedCards() {
  const { gameState } = useGameState<RazziaGameState>();

  if (!gameState) {
    return null;
  }

  return Object.values(LOOT_CARDS).map((card, index) => {
    return <RevealedCard key={index} card={card} />;
  });

  // <div>
  //   {(gameState.revealedCards || []).map((card, index) => (
  //     <RevealedCard key={index} card={card} />
  //   ))}
  // </div>
}
