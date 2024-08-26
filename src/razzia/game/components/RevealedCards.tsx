import useGameState from "../../../shared/hooks/useGameState";
import { LOOT_CARDS, RazziaGameState } from "../types";
import RevealedCard from "./RevealedCard";

export default function RevealedCards() {
  const { gameState } = useGameState<RazziaGameState>();

  if (!gameState) {
    return null;
  }

  // return Object.values(LOOT_CARDS).map((card, index) => {
  //   return <RevealedCard key={index} card={card} />;
  // });

  return (
    <>
      {(gameState.revealedCards || []).map((card, index) => {
        return card !== LOOT_CARDS.POLICE_RAIDS ? (
          <RevealedCard key={index} card={card} />
        ) : null;
      })}
    </>
  );
}
