import { useMemo } from "react";
import { HighSocietyPlayerState } from "../types";
import { Flex } from "@mantine/core";
import CardFront from "../../card/CardFront";

export default function PlayerGameState({
  player,
  loggedInUser,
}: {
  player: HighSocietyPlayerState;
  loggedInUser: string;
}) {
  const renderedStatusCards = useMemo(() => {
    if (!player.statusCards) {
      return "None";
    }

    return (
      <Flex>
        {player.statusCards.map((card) => {
          return <CardFront key={card} card={card} size="sm" />;
        })}
      </Flex>
    );
  }, [player.statusCards]);

  if (loggedInUser === player.email) {
    return (
      <>
        <div style={{ marginBottom: "12px" }}>
          <b>{player.email.split("@")[0]}</b>
        </div>
        <div>Money cards in hand: {(player.moneyCards || []).join(", ")}</div>
        <div>Status cards: {renderedStatusCards}</div>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: "12px" }}>
        <b>{player.email.split("@")[0]}</b>
      </div>
      <div>Money cards in hand: {(player.moneyCards || []).length}</div>
      <div>Status cards: {renderedStatusCards}</div>
    </>
  );
}
