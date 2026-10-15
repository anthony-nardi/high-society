import { useCallback, useState } from "react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import takeActiveCard from "../../client/takeActiveCard";
import placeChip from "../../client/placeChip";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import displayName from "../../../shared/utils/displayName";
import { takeOutcome } from "../scoring";
import classes from "./ActionPanel.module.css";

/** Fixed strip along the bottom: Take / Place chip with what each would cost. */
export default function ActionPanel({
  isActive,
  activePlayer,
  activeCard,
  chipsPlaced,
  cards,
  chips,
}: {
  isActive: boolean;
  activePlayer: string;
  activeCard: number;
  chipsPlaced: number;
  cards: number[];
  chips: number;
}) {
  const { lobbyId } = useLobbyContext();
  const [loading, setLoading] = useState(false);

  const handleTake = useCallback(async () => {
    setLoading(true);
    await takeActiveCard({ lobbyUID: lobbyId || 0 });
    setLoading(false);
  }, [lobbyId]);

  const handlePlaceChip = useCallback(async () => {
    setLoading(true);
    await placeChip({ lobbyUID: lobbyId || 0 });
    setLoading(false);
  }, [lobbyId]);

  const outcome = takeOutcome(activeCard, chipsPlaced, cards);
  const noChips = chips < 1;

  let hint: string;
  if (!isActive) {
    hint = `Waiting for ${displayName(activePlayer)}. You have ${chips} chip${
      chips === 1 ? "" : "s"
    }.`;
  } else if (outcome.bridgesRuns) {
    hint = `The ${activeCard} joins your runs and lowers your score by ${-outcome.pointsAdded}. Taking it also nets ${chipsPlaced} chip${
      chipsPlaced === 1 ? "" : "s"
    }.`;
  } else if (outcome.joinsRun) {
    hint = `The ${activeCard} extends your run, so it costs nothing. Taking it nets ${chipsPlaced} chip${
      chipsPlaced === 1 ? "" : "s"
    }.`;
  } else if (noChips) {
    hint = `You have no chips left, so you must take the ${activeCard}.`;
  } else {
    hint = `Taking the ${activeCard} with ${chipsPlaced} chip${
      chipsPlaced === 1 ? "" : "s"
    } on it changes your score by ${outcome.net > 0 ? "+" : ""}${
      outcome.net
    }. Placing a chip leaves you ${chips - 1}.`;
  }

  return (
    <div
      className={`${classes.panel} safe-bottom ${isActive ? classes.active : ""}`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          {isActive && (
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              Your turn
            </Badge>
          )}
          <Button
            disabled={!isActive || loading}
            loading={loading}
            onClick={handleTake}
            color={outcome.net <= 0 ? "green" : undefined}
          >
            Take the {activeCard}
            {chipsPlaced > 0
              ? ` and ${chipsPlaced} chip${chipsPlaced === 1 ? "" : "s"}`
              : ""}
          </Button>
          <Button
            variant="default"
            disabled={!isActive || loading || noChips}
            loading={loading}
            onClick={handlePlaceChip}
            title={noChips ? "You have no chips left" : undefined}
          >
            Place a chip ({chips} left)
          </Button>
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
