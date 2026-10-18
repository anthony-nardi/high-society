import {
  Badge,
  Button,
  Drawer,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";
import type { GameName } from "@games/shared/types";
import { GAME_INFO, GAME_NAMES } from "@games/shared/gameInfo";
import { useUserContext } from "../context/useUserContext";
import displayName from "../utils/displayName";
import {
  GameStats,
  ORDINAL,
  PlayerStats,
  statsKey,
  useAllStats,
} from "../hooks/useStats";

const placesOf = (stats: GameStats | undefined) =>
  [1, 2, 3, 4, 5, 6].map((rank) => stats?.places?.[String(rank)] ?? 0);

function PlacesCell({ stats }: { stats: GameStats | undefined }) {
  const places = placesOf(stats);
  if (!places.some((n) => n > 0)) return <Text size="xs">–</Text>;
  return (
    <Text size="xs" style={{ whiteSpace: "nowrap" }}>
      {places
        .map((n, i) =>
          n ? `${ORDINAL(i + 1)}${i === 5 ? "+" : ""} ×${n}` : "",
        )
        .filter(Boolean)
        .join(" · ")}
    </Text>
  );
}

/**
 * A "Stats" button pinned to the top-right corner, beside the sound
 * toggle, that opens your record in every game and the table for the
 * game on this page.
 */
export default function StatsDrawer({ gameName }: { gameName: GameName }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { user } = useUserContext();
  const players = useAllStats(opened && !!user);
  const [view, setView] = useState<"mine" | "table">("mine");

  const mine = useMemo(
    () =>
      user
        ? players?.find((p) => statsKey(p.email) === statsKey(user.email || ""))
        : undefined,
    [players, user],
  );
  const recent = useMemo(
    () =>
      Object.entries(mine?.recent || {})
        .map(([id, r]) => ({ id, ...r }))
        .sort((a, b) => b.finishedAt - a.finishedAt)
        .slice(0, 12),
    [mine],
  );
  const table = useMemo(() => {
    const rows = (players || [])
      .map((p) => ({ player: p, stats: p.games?.[gameName] }))
      .filter((r) => (r.stats?.played ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.stats?.wins ?? 0) - (a.stats?.wins ?? 0) ||
          (b.stats?.played ?? 0) - (a.stats?.played ?? 0),
      );
    return rows as { player: PlayerStats; stats: GameStats }[];
  }, [players, gameName]);

  if (!user) return null;

  return (
    <>
      <Button
        variant={opened ? "filled" : "subtle"}
        size="xs"
        onClick={toggle}
        aria-expanded={opened}
        style={{ position: "fixed", top: 12, right: 148, zIndex: 1100 }}
      >
        Stats
      </Button>
      <Drawer
        opened={opened}
        onClose={close}
        title="Statistics"
        position="right"
        size="md"
        zIndex={1050}
      >
        <Stack gap="md">
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(v) => setView(v as "mine" | "table")}
            data={[
              { value: "mine", label: "My record" },
              { value: "table", label: `${GAME_INFO[gameName].title} table` },
            ]}
          />
          {players === null ? (
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          ) : view === "mine" ? (
            <>
              <Text size="sm" c="dimmed">
                {mine?.played
                  ? `${mine.played} game${mine.played === 1 ? "" : "s"} played, ${mine.wins ?? 0} won. Games against bots count too.`
                  : "No finished games yet. Results are recorded when a game ends."}
              </Text>
              {mine?.games && (
                <Table.ScrollContainer minWidth={420}>
                  <Table withTableBorder fz="sm" verticalSpacing={4}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Game</Table.Th>
                        <Table.Th ta="right">Played</Table.Th>
                        <Table.Th ta="right">Won</Table.Th>
                        <Table.Th>Places</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {GAME_NAMES.filter((g) => mine.games?.[g]?.played).map(
                        (g) => {
                          const stats = mine.games?.[g];
                          return (
                            <Table.Tr
                              key={g}
                              style={{
                                fontWeight: g === gameName ? 700 : undefined,
                              }}
                            >
                              <Table.Td>{GAME_INFO[g].title}</Table.Td>
                              <Table.Td ta="right">
                                {stats?.played ?? 0}
                              </Table.Td>
                              <Table.Td ta="right">{stats?.wins ?? 0}</Table.Td>
                              <Table.Td>
                                <PlacesCell stats={stats} />
                              </Table.Td>
                            </Table.Tr>
                          );
                        },
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
              {recent.length > 0 && (
                <>
                  <Title order={5}>Recent results</Title>
                  <Stack gap={4}>
                    {recent.map((r) => (
                      <Text key={r.id} size="sm">
                        <Badge
                          size="xs"
                          radius="sm"
                          color={r.rank === 1 ? "yellow" : "gray"}
                          variant={r.rank === 1 ? "filled" : "light"}
                          mr={6}
                        >
                          {ORDINAL(r.rank)} of {r.seats}
                        </Badge>
                        {GAME_INFO[r.game]?.title ?? r.game}
                        {r.bots
                          ? ` · ${r.bots} bot${r.bots === 1 ? "" : "s"}`
                          : ""}
                        <Text component="span" size="xs" c="dimmed">
                          {" "}
                          · {new Date(r.finishedAt).toLocaleDateString()}
                        </Text>
                      </Text>
                    ))}
                  </Stack>
                </>
              )}
            </>
          ) : table.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nobody has finished a game of {GAME_INFO[gameName].title} yet.
            </Text>
          ) : (
            <Table.ScrollContainer minWidth={420}>
              <Table withTableBorder fz="sm" verticalSpacing={4}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Player</Table.Th>
                    <Table.Th ta="right">Played</Table.Th>
                    <Table.Th ta="right">Won</Table.Th>
                    <Table.Th>Places</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {table.map(({ player, stats }) => (
                    <Table.Tr
                      key={player.email}
                      style={{
                        fontWeight:
                          statsKey(player.email) === statsKey(user.email || "")
                            ? 700
                            : undefined,
                      }}
                    >
                      <Table.Td>{displayName(player.email)}</Table.Td>
                      <Table.Td ta="right">{stats.played ?? 0}</Table.Td>
                      <Table.Td ta="right">{stats.wins ?? 0}</Table.Td>
                      <Table.Td>
                        <PlacesCell stats={stats} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
