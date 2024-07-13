import { GameState, PlayerState } from "../types";

export default function PlayerGameState({ player }: { player: PlayerState }) {
  return (
    <>
      <div>Name: {player.email}</div>
      <div>Cards in hand: {player.moneyCards.length}</div>
      <div>Status Cards: {player.statusCards || "None"}</div>
    </>
  );
}
