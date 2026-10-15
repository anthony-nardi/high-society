import { Group, Text } from "@mantine/core";
import { NoThanksPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import PlayerCards from "./player/PlayerCards";
import displayName from "../../../shared/utils/displayName";
import { cardPoints } from "../scoring";

interface PlayerGameStateProps {
  player: NoThanksPlayerState;
}

/** Name, cards (as runs) and, for the logged-in player only, chips and score. */
export default function PlayerGameState({ player }: PlayerGameStateProps) {
  const { user } = useUserContext();
  const { email, cards, chips } = player;
  const isCurrentUser = !!user && user.email === email;
  const held = cards || [];

  return (
    <>
      <Group gap="xs" mb={6} align="baseline">
        <Text fw={700}>
          {displayName(email)}
          {isCurrentUser && (
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              (you)
            </Text>
          )}
        </Text>
        <Text size="sm" c="dimmed">
          {held.length} card{held.length === 1 ? "" : "s"}
        </Text>
        {isCurrentUser && (
          <Text size="sm" c="dimmed">
            · {chips} chip{chips === 1 ? "" : "s"} · score{" "}
            {cardPoints(held) - chips}
          </Text>
        )}
      </Group>
      <PlayerCards cards={held} />
    </>
  );
}
