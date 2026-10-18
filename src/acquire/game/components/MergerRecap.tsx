import { useState } from "react";
import { Badge, Button, Group, Paper, Stack, Table, Text } from "@mantine/core";
import { AcquireGameState, AcquirePlayerState } from "../types";
import displayName from "../../../shared/utils/displayName";
import { bonusRank, CHAIN_COLOUR, label, money } from "../board";

function Chip({ chain }: { chain: keyof typeof CHAIN_COLOUR }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 8px",
        borderRadius: 6,
        background: CHAIN_COLOUR[chain],
        color: "#fff",
        fontWeight: 800,
        fontSize: 12,
        border: "1px solid rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
      }}
    >
      {label(chain)}
    </span>
  );
}

/**
 * The last merger in full, once it is over: every swallowed chain's
 * bonuses and settlements, and what each player made from it. Stays on
 * the table until the next tile is played.
 */
export default function MergerRecap({
  gameState,
  me,
}: {
  gameState: AcquireGameState;
  me: AcquirePlayerState | null;
}) {
  const recap = gameState.lastMerger;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  if (!recap || gameState.merger) return null;
  const key = `${recap.tile}:${recap.survivor}:${recap.size}`;
  if (dismissed === key) return null;

  // What each player made: bonuses plus sale cash, and shares traded into the survivor.
  const made = new globalThis.Map<
    string,
    { bonus: number; cash: number; traded: number; kept: number }
  >();
  const bump = (
    email: string,
    patch: Partial<{
      bonus: number;
      cash: number;
      traded: number;
      kept: number;
    }>,
  ) => {
    const row = made.get(email) || { bonus: 0, cash: 0, traded: 0, kept: 0 };
    made.set(email, {
      bonus: row.bonus + (patch.bonus ?? 0),
      cash: row.cash + (patch.cash ?? 0),
      traded: row.traded + (patch.traded ?? 0),
      kept: row.kept + (patch.kept ?? 0),
    });
  };
  for (const c of recap.chains) {
    for (const p of c.paid || []) bump(p.email, { bonus: p.amount });
    for (const s of c.settled || [])
      bump(s.email, { cash: s.cash, traded: s.trade / 2, kept: s.keep });
  }
  const rows = [...made.entries()].sort(
    (a, b) => b[1].bonus + b[1].cash - (a[1].bonus + a[1].cash),
  );
  const name = (email: string) =>
    email === me?.email ? "You" : displayName(email);

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      style={{ maxWidth: 560, width: "100%" }}
      aria-label="Last merger"
    >
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={6} wrap="wrap" style={{ minWidth: 0 }}>
            <Badge color="gray" variant="light" radius="sm">
              Merger at {recap.tile} by {name(recap.by)}
            </Badge>
            <Chip chain={recap.survivor} />
            <Text size="xs" c="dimmed">
              swallowed {recap.chains.map((c) => label(c.chain)).join(" and ")}{" "}
              · now {recap.size} tiles
            </Text>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Less" : "More"}
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => setDismissed(key)}
            >
              Hide
            </Button>
          </Group>
        </Group>

        {rows.length > 0 && (
          <Table.ScrollContainer minWidth={360}>
            <Table fz="xs" verticalSpacing={2} withRowBorders={false}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Who made what</Table.Th>
                  <Table.Th ta="right">Bonuses</Table.Th>
                  <Table.Th ta="right">Sales</Table.Th>
                  <Table.Th ta="right">Traded in</Table.Th>
                  <Table.Th ta="right">Kept</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map(([email, r]) => (
                  <Table.Tr
                    key={email}
                    style={{ fontWeight: email === me?.email ? 800 : 500 }}
                  >
                    <Table.Td>{name(email)}</Table.Td>
                    <Table.Td ta="right" c="green.4">
                      {r.bonus ? `+${money(r.bonus)}` : "–"}
                    </Table.Td>
                    <Table.Td ta="right" c="green.4">
                      {r.cash ? `+${money(r.cash)}` : "–"}
                    </Table.Td>
                    <Table.Td ta="right">
                      {r.traded ? `${r.traded} ${label(recap.survivor)}` : "–"}
                    </Table.Td>
                    <Table.Td ta="right">{r.kept || "–"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        {open &&
          recap.chains.map((c) => (
            <Stack key={c.chain} gap={2}>
              <Group gap={6} wrap="wrap">
                <Chip chain={c.chain} />
                <Text size="xs" c="dimmed">
                  {c.size} tiles · {money(c.price)} a share
                </Text>
              </Group>
              {(c.paid || []).map((p) => (
                <Text key={`p-${p.email}`} size="xs">
                  {name(p.email)} took <b>{money(p.amount)}</b> as{" "}
                  {bonusRank(p.amount, c.price, gameState.mode)}
                  {c.holders
                    ? ` with ${c.holders.find((h) => h.email === p.email)?.shares ?? 0} shares`
                    : ""}
                  .
                </Text>
              ))}
              {!(c.paid || []).length && (
                <Text size="xs" c="dimmed">
                  Nobody held {label(c.chain)}.
                </Text>
              )}
              {(c.settled || []).map((s) => (
                <Text key={`s-${s.email}`} size="xs" c="dimmed">
                  {name(s.email)}{" "}
                  {[
                    s.sell ? `sold ${s.sell} for ${money(s.cash)}` : "",
                    s.trade
                      ? `traded ${s.trade} for ${s.trade / 2} ${label(recap.survivor)}`
                      : "",
                    s.keep ? `kept ${s.keep}` : "",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  .
                </Text>
              ))}
            </Stack>
          ))}
      </Stack>
    </Paper>
  );
}
