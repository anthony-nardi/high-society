import { useMemo } from "react";
import { PlayerState } from "../types";
import { Flex } from "@mantine/core";
import CardFront from "../../card/CardFront";

export default function PlayerGameState({ player }: { player: PlayerState }) {
  const renderedStatusCards = useMemo(() => {
    if (!player.statusCards) {
      return "None";
    }

    return (
      <Flex>
        {player.statusCards.map((card) => {
          return <CardFront card={card} size="sm" />;
        })}
      </Flex>
    );
  }, [player.statusCards]);

  return (
    <>
      <div style={{ marginBottom: "12px" }}>
        <b>{player.email}</b>
      </div>
      <div>Money cards in hand: {player.moneyCards.length}</div>
      <div>Status cards: {renderedStatusCards}</div>
    </>
  );
}
