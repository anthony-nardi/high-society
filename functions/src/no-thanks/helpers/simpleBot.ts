import { NoThanksGameState, NoThanksPlayerState } from "../types";

export function makeBestMoveForActivePlayer(gameState: NoThanksGameState) {
  const activePlayer = gameState.public.players.find(
    (player) => player.email === gameState.public.activePlayer
  );

  if (!activePlayer) {
    throw new Error("Active player not found");
  }

  if (activePlayer.chips === 0 || shouldTakeCard(gameState, activePlayer)) {
    return 0;
  } else {
    return 1;
  }
}

function shouldTakeCard(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState
): boolean {
  if (!gameState.public.activeCard) {
    return false;
  }

  const activeCard = gameState.public.activeCard;

  // Check if the active card can create a run with the player's existing cards
  const canCreateRun = player.cards?.some(
    (card) => card === activeCard - 1 || card === activeCard + 1
  );

  // Calculate the number of chips needed to take the card based on its value
  const chipsNeeded = Math.max(4, Math.floor((activeCard - 3) / 5) * 2); // More chips for higher cards

  // Check if taking the card would give the player the required number of chips
  const wouldGiveRequiredChips = gameState.public.chipsPlaced >= chipsNeeded;

  // Check if the card completes a run for any opponent
  const completesRunForOpponent = gameState.public.players.some(
    (opponent) =>
      opponent.email !== player.email &&
      opponent.cards?.some(
        (card) => card === activeCard - 1 || card === activeCard + 1
      )
  );

  // Check if there are at least 2 chips on the active card
  const atLeastTwoChips = gameState.public.chipsPlaced >= 2;

  const canCreateRunAndDoesntCompleteOpponentRun =
    canCreateRun && !completesRunForOpponent;

  const canCreateRunAndDoesntCompleteOpponentRunAndHasChips =
    canCreateRunAndDoesntCompleteOpponentRun && atLeastTwoChips;

  return (
    // Take the card if it can create a run and doesn't complete a run for an opponent and
    // there are at least 2 chips on the card. Basically we can be greedy here.
    canCreateRunAndDoesntCompleteOpponentRunAndHasChips ||
    // Take the card if it can create a run and completes a run for an opponent. Give them no chance.
    (canCreateRun && completesRunForOpponent) ||
    // Take the card if it would give the player the required number of chips
    wouldGiveRequiredChips ||
    // Take the card if there are at least 2 chips on the active card and it completes a run for an opponent
    (completesRunForOpponent && atLeastTwoChips)
  );
}
