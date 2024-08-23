import { Flex } from "@mantine/core";
import useGameState from "../../../shared/hooks/useGameState";
import { RazziaGameState } from "../types";
import Deck from "../assets/Deck";
import Money from "../assets/Money";

export default function SharedBoard() {
  const { gameState } = useGameState<RazziaGameState>();

  if (!gameState) {
    return null;
  }

  console.log(gameState);

  return (
    <div>
      <Flex direction={"column"}>
        <Flex direction={"column"}>
          <div>Round: {gameState?.round}/3</div>
          <div>Police Raids: {gameState.policeRaids}/7</div>
          <Money isActive={true} amount={gameState.money} />
        </Flex>
        <Deck />
      </Flex>
    </div>
  );
}
