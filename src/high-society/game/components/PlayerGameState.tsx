import { Flex, Text } from "@mantine/core";
import { HighSocietyPlayerState } from "../types";
import CardFront from "../../card/CardFront";
import displayName from "../../../shared/utils/displayName";

export default function PlayerGameState({
  player,
  loggedInUser,
}: {
  player: HighSocietyPlayerState;
  loggedInUser: string;
}) {
  const statusCards = player.statusCards || [];
  const isCurrentUser = loggedInUser === player.email;
  const cardsInHand = (player.moneyCards || []).length;

  return (
    <>
      <Text fw={700} mb={4}>
        {displayName(player.email)}
        {isCurrentUser && (
          <Text component="span" c="dimmed" fw={400}>
            {" "}
            (you)
          </Text>
        )}
      </Text>
      <Text size="sm" c="dimmed" mb={6}>
        {cardsInHand} money card{cardsInHand === 1 ? "" : "s"} in hand
        {isCurrentUser ? ", shown below" : ""}
      </Text>
      {statusCards.length === 0 ? (
        <Text size="sm" c="dimmed">
          No status cards yet
        </Text>
      ) : (
        <Flex gap={4} wrap="wrap">
          {statusCards.map((card, index) => (
            <CardFront key={`${card}-${index}`} card={card} size="sm" />
          ))}
        </Flex>
      )}
    </>
  );
}
