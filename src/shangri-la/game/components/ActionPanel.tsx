import {
  Badge,
  Button,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { Master, ShangriLaGameState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import { MASTER_LABEL, originIsStronger, strengthOf, VILLAGES } from "../board";
import classes from "./ActionPanel.module.css";

export type Mode = "place" | "recruit" | "journey";

/** Fixed strip: choose the action, then the board takes the village taps and this strip the rest. */
export default function ActionPanel({
  gameState,
  isActive,
  mode,
  onMode,
  village,
  destination,
  types,
  picks,
  loading,
  onType,
  onTogglePick,
  onConfirm,
  onCancel,
}: {
  gameState: ShangriLaGameState;
  isActive: boolean;
  mode: Mode;
  onMode: (mode: Mode) => void;
  /** The village tapped first, if any. */
  village: number | null;
  /** For journeys: the village tapped second. */
  destination: number | null;
  /** Disciplines available in the tapped village for placing or recruiting. */
  types: Master[];
  /** Chosen recruits so far. */
  picks: [number, Master][];
  loading: boolean;
  onType: (type: Master) => void;
  onTogglePick: (village: number, type: Master) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const setup = gameState.phase === "SETUP";
  const who = displayName(gameState.activePlayer);

  if (!isActive) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {loading ? (
            <>
              Sending your move
              <ThinkingDots />
            </>
          ) : (
            <>
              Waiting for {who}, who is{" "}
              {setup ? "placing a master" : "taking a turn"}.
              {isBotName(gameState.activePlayer) && <ThinkingDots />}
            </>
          )}
        </Text>
      </div>
    );
  }

  let hint: string;
  if (loading) hint = "Sending your move…";
  else if (setup)
    hint =
      village === null
        ? "Tap a glowing village, then choose which master to place there. One of each discipline, within the setup limits."
        : `Choose a discipline for ${VILLAGES[village].name}.`;
  else if (mode === "place")
    hint =
      village === null
        ? "Tap a village where you already have a master, then choose a discipline for an empty space."
        : `Choose a discipline to place in ${VILLAGES[village].name}.`;
  else if (mode === "recruit")
    hint = picks.length
      ? `${picks.length} of 2 chosen. Add another or confirm.`
      : "Tap a village with your masters, then pick up to two to take a student.";
  else if (village === null)
    hint =
      "Tap a village where you have a student, then a neighbouring village to send every student there.";
  else if (destination === null)
    hint = `Tap a neighbour of ${VILLAGES[village].name}. All students there travel, including rivals', and the bridge breaks.`;
  else {
    const stronger = originIsStronger(gameState, village, destination);
    hint = `${VILLAGES[village].name} (${strengthOf(gameState.villages[village])}) against ${VILLAGES[destination].name} (${strengthOf(gameState.villages[destination])}): ${stronger ? "stronger, so arrivals displace rivals and join your own masters." : "weaker, so arrivals only fill empty spaces."}`;
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
          {loading && <Loader size="xs" color="yellow" />}
          {!setup && !loading && (
            <SegmentedControl
              size="xs"
              value={mode}
              onChange={(v) => onMode(v as Mode)}
              data={[
                { label: "Place", value: "place" },
                { label: "Recruit", value: "recruit" },
                { label: "Journey", value: "journey" },
              ]}
              aria-label="Action"
            />
          )}
          {!loading &&
            (setup || mode === "place") &&
            village !== null &&
            types.map((type) => (
              <Button key={type} size="xs" onClick={() => onType(type)}>
                {MASTER_LABEL[type]}
              </Button>
            ))}
          {!loading &&
            mode === "recruit" &&
            !setup &&
            village !== null &&
            types.map((type) => {
              const chosen = picks.some(
                ([v, t]) => v === village && t === type,
              );
              return (
                <Button
                  key={type}
                  size="xs"
                  variant={chosen ? "filled" : "default"}
                  color={chosen ? "yellow" : undefined}
                  onClick={() => onTogglePick(village, type)}
                  aria-pressed={chosen}
                >
                  {MASTER_LABEL[type]}
                </Button>
              );
            })}
          {!loading && mode === "recruit" && !setup && picks.length > 0 && (
            <Button onClick={onConfirm}>Recruit {picks.length}</Button>
          )}
          {!loading &&
            mode === "journey" &&
            !setup &&
            village !== null &&
            destination !== null && (
              <Button onClick={onConfirm}>
                Send to {VILLAGES[destination].name}
              </Button>
            )}
          {!loading && (village !== null || picks.length > 0) && (
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
