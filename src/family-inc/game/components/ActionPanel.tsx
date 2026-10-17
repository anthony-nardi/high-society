import { useCallback, useState } from "react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { FamilyIncGameState, FamilyIncPlayerState } from "../types";
import drawChip from "../../client/drawChip";
import stopTurn from "../../client/stopTurn";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import displayName from "../../../shared/utils/displayName";
import { chipPoints, stealsOnStop } from "../odds";
import classes from "./ActionPanel.module.css";

/** Draw or stop, with the odds and what each choice is worth. */
export default function ActionPanel({
  gameState,
  player,
  isActive,
}: {
  gameState: FamilyIncGameState;
  player: FamilyIncPlayerState;
  isActive: boolean;
}) {
  const { lobbyId } = useLobbyContext();
  const [loading, setLoading] = useState(false);
  const lobbyUID = `${lobbyId}`;

  const call = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const drawn = (gameState.drawnThisTurn || []).length;
  const kept = chipPoints(player.held);
  const { steals, points: stealPoints } = stealsOnStop(gameState, player.email);
  const diamondOnBust = drawn + 1 <= 3;
  const stopWins = player.score + kept + stealPoints >= 100;

  if (!isActive) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          Waiting for {displayName(gameState.activePlayer)}. You have{" "}
          {player.score} point{player.score === 1 ? "" : "s"}
          {kept > 0 ? ` and ${kept} to bank on your turn` : ""}
          {player.diamonds > 0
            ? ` and ${player.diamonds} diamond${player.diamonds === 1 ? "" : "s"}`
            : ""}
          .
        </Text>
      </div>
    );
  }

  const stealText =
    steals.length > 0
      ? ` and steal ${steals
          .map((s) => `${s.n}×${s.value} from ${displayName(s.from)}`)
          .join(", ")} (+${stealPoints})`
      : "";

  let hint: string;
  if (drawn === 0) {
    hint =
      "Draw a chip. A bust on the first three draws earns a diamond; three diamonds are worth 50 points.";
  } else {
    hint = `Stop: keep ${kept} point${kept === 1 ? "" : "s"} of chips${stealText}, banked at your next turn${
      stopWins ? ", which wins the game" : ""
    }. Draw: a repeat value busts${
      diamondOnBust ? ", for a diamond" : " and loses it all"
    }.`;
  }

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn
          </Badge>
          <Button
            disabled={loading}
            loading={loading}
            onClick={() => call(() => drawChip({ lobbyUID }))}
          >
            Draw a chip
          </Button>
          <Button
            variant={drawn > 0 ? "filled" : "default"}
            color={stopWins ? "green" : drawn > 0 ? "yellow" : undefined}
            disabled={loading || drawn === 0}
            loading={loading}
            onClick={() => call(() => stopTurn({ lobbyUID }))}
            title={drawn === 0 ? "Draw at least one chip first" : undefined}
          >
            {drawn > 0 ? `Stop with ${kept + stealPoints}` : "Stop"}
          </Button>
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
