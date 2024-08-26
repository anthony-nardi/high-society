import { Flex } from "@mantine/core";
import useGameState from "../../../shared/hooks/useGameState";
import { RazziaGameState } from "../types";
import Deck from "../assets/Deck";
import Money from "../assets/Money";
import RevealedCards from "./RevealedCards";

export default function SharedBoard() {
  const { gameState } = useGameState<RazziaGameState>();

  if (!gameState) {
    return null;
  }

  return (
    <div>
      <Flex direction={"column"}>
        <Flex direction={"row"}>
          <div>Round: {gameState?.round}/3</div>
          <div style={{ marginLeft: "8px" }}>
            Police Raids: {gameState.policeRaids}/7
          </div>
          <div style={{ marginLeft: "8px" }}>
            <Money isActive={true} amount={gameState.money} />
          </div>
        </Flex>
        <Flex>
          <Deck />
          <RevealedCards />
        </Flex>
      </Flex>
    </div>
  );
}
