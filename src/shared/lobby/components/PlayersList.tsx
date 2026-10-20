import { LobbyPlayer } from "../types";
import { ActionIcon, Badge, Group, Stack, Text } from "@mantine/core";
import displayName, { isBotName, personaOf } from "../../utils/displayName";
import { TEMPER_LABEL } from "@games/shared/personas";
import classes from "../lobby.module.css";

export default function PlayersList({
  players,
  onRemoveBot,
  removingBot,
  seatIcons,
  botIcon = "🤖",
}: {
  players: LobbyPlayer[];
  /** When given, bots get a remove control. */
  onRemoveBot?: (email: string) => void;
  removingBot?: string | null;
  /** A game's icons for the people at the table, handed out in order. */
  seatIcons?: string[];
  botIcon?: string;
}) {
  let humans = 0;
  return (
    <Stack gap="xs" data-testid="players-list">
      {players.map((player) => {
        const isBot = player.isBot || isBotName(player.email);
        const persona = isBot ? personaOf(player.email) : undefined;
        const icon = isBot
          ? (persona?.avatar ?? botIcon)
          : seatIcons?.length
            ? seatIcons[humans++ % seatIcons.length]
            : "🙂";
        return (
          <Group
            key={player.email}
            justify="space-between"
            wrap="nowrap"
            px="md"
            py="sm"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: 8,
              background: "var(--mantine-color-default)",
            }}
          >
            <Group gap="sm" wrap="nowrap">
              <Text
                component="span"
                className={classes.seatIcon}
                aria-hidden="true"
              >
                {icon}
              </Text>
              <div>
                <Text fw={600}>{displayName(player.email)}</Text>
                <Text size="xs" c="dimmed">
                  {isBot
                    ? persona
                      ? `${TEMPER_LABEL[persona.temper]} bot · ${persona.blurb}`
                      : "Bot"
                    : player.email}
                </Text>
              </div>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Badge
                variant={player.ready ? "filled" : "outline"}
                color={player.ready ? "green" : "gray"}
                radius="sm"
              >
                {player.ready ? "Ready" : "Waiting"}
              </Badge>
              {isBot && onRemoveBot && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove ${displayName(player.email)}`}
                  title="Remove bot"
                  loading={removingBot === player.email}
                  disabled={!!removingBot}
                  onClick={() => onRemoveBot(player.email)}
                >
                  ✕
                </ActionIcon>
              )}
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
