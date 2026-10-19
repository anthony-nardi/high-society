import { Badge, Group, Stack, Text } from "@mantine/core";
import { Card, CondottiereGameState } from "../types";
import { colourOf, isMercenary, strengthOf, REGIONS } from "../board";
import displayName from "../../../shared/utils/displayName";
import CardFace from "./CardFace";

/** Every player's line in the current battle, with its strength. */
export default function BattleLines({
  gameState,
  me,
  pickingMercenary,
  onMercenary,
}: {
  gameState: CondottiereGameState;
  me?: string;
  /** A Scarecrow is in play: your mercenaries become targets. */
  pickingMercenary: boolean;
  onMercenary: (index: number) => void;
}) {
  const region = gameState.battlefield;
  const key = `${gameState.turn}:${region}`;
  return (
    <Stack gap="xs" data-testid="battle-lines">
      <Group gap="xs" justify="center">
        <Badge color="red" variant="light" radius="sm" size="lg">
          Battle for {region !== undefined ? REGIONS[region].name : "…"}
        </Badge>
        {gameState.season && (
          <Badge
            color={gameState.season === "WINTER" ? "blue" : "green"}
            variant="light"
            radius="sm"
            size="lg"
          >
            {gameState.season === "WINTER"
              ? "Winter: mercenaries count 1"
              : "Spring: the strongest gain 3"}
          </Badge>
        )}
      </Group>
      {gameState.players.map((player) => {
        const line = player.line || [];
        const strength = strengthOf(line, gameState.season);
        const mine = player.email === me;
        return (
          <Group
            key={player.email}
            gap="xs"
            align="center"
            wrap="nowrap"
            style={{ opacity: player.passed ? 0.6 : 1 }}
          >
            <Stack gap={0} style={{ width: 110, flex: "0 0 auto" }}>
              <Group gap={4} wrap="nowrap">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: colourOf(gameState, player.email),
                    flex: "0 0 auto",
                  }}
                />
                <Text size="sm" fw={600} truncate>
                  {displayName(player.email)}
                </Text>
              </Group>
              <Group gap={4}>
                <Text
                  size="lg"
                  fw={800}
                  lh={1}
                  aria-label={`${displayName(player.email)} strength ${strength}`}
                >
                  {strength}
                </Text>
                {player.passed && (
                  <Badge size="xs" color="gray" variant="light">
                    passed
                  </Badge>
                )}
              </Group>
            </Stack>
            <Group
              gap={4}
              wrap="wrap"
              style={{ minWidth: 0 }}
              aria-label={`${displayName(player.email)}'s line`}
            >
              {line.length === 0 ? (
                <Text size="xs" c="dimmed">
                  nothing yet
                </Text>
              ) : (
                line.map((card: Card, i) => {
                  const target = mine && pickingMercenary && isMercenary(card);
                  return (
                    <div
                      key={`${key}-${i}`}
                      className={`piece piece-drop ${target ? "row-glow" : ""}`}
                      style={
                        target
                          ? {
                              padding: 6,
                              borderRadius: 10,
                              background: "rgba(255, 216, 107, 0.18)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }
                          : undefined
                      }
                    >
                      <CardFace
                        card={card}
                        width={target ? 64 : 38}
                        onClick={target ? () => onMercenary(i) : undefined}
                        selected={target}
                      />
                      {target && (
                        <Text size="xs" fw={700} c="yellow.4">
                          take back
                        </Text>
                      )}
                    </div>
                  );
                })
              )}
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
