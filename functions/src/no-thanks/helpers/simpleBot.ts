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
  const chipsNeeded = Math.floor((activeCard - 3) / 5) * 2; // More chips for higher cards

  // Check if taking the card would give the player the required number of chips
  const wouldGiveRequiredChips = gameState.public.chipsPlaced >= chipsNeeded;

  // Calculate the preference based on the card's value
  const cardPreference = 35 - activeCard; // Higher value for cards closer to 3, lower for cards closer to 35

  // Define a threshold for the card preference
  const preferenceThreshold = 20; // Adjust this value based on your strategy

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

  return (
    canCreateRun ||
    wouldGiveRequiredChips ||
    cardPreference > preferenceThreshold ||
    (completesRunForOpponent && atLeastTwoChips)
  );
}
