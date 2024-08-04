import { useMemo } from "react";
import { NoThanksPlayerState } from "../types";
import { Flex } from "@mantine/core";

export default function PlayerGameState({
  player,
  loggedInUser,
}: {
  player: NoThanksPlayerState;
  loggedInUser: string;
}) {
  const renderedCards = useMemo(() => {
    if (!player.cards) {
      return "None";
    }

    return (
      <Flex>
        {player.cards.map((card) => {
          return <b>{card} , </b>;
        })}
      </Flex>
    );
  }, [player.cards]);

  return (
    <>
      <div style={{ marginBottom: "12px" }}>
        <b>{player.email.split("@")[0]}</b>
      </div>
      <div>Cards: {renderedCards}</div>
      {loggedInUser === player.email ? (
        <div>
          <Flex>Chips: {player.chips}</Flex>
        </div>
      ) : null}
    </>
  );
}
