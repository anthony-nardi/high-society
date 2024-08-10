import { Flex } from "@mantine/core";
import CardFront from "../../../card/CardFront";
import { useMemo } from "react";

export default function PlayerCards({ cards }: { cards?: number[] }) {
  const renderedCards = useMemo(() => {
    if (!cards) {
      return "None";
    }

    return (
      <Flex wrap="wrap">
        {cards
          .sort((a, b) => a - b)
          .map((card) => (
            <CardFront key={card} card={card} size="sm" />
          ))}
      </Flex>
    );
  }, [cards]);

  return <>{renderedCards}</>;
}
