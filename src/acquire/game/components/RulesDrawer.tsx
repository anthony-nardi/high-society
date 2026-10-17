import { Group, List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { CHAIN_COLOUR, CHAINS, label, money, priceOf, TIER } from "../board";

const SIZES: [string, number][] = [
  ["2", 2],
  ["3", 3],
  ["4", 4],
  ["5", 5],
  ["6–10", 6],
  ["11–20", 11],
  ["21–30", 21],
  ["31–40", 31],
  ["41+", 41],
];

export default function AcquireRules() {
  return (
    <RulesDrawer title="How to play Acquire">
      <Stack gap="md">
        <Text>
          Sid Sackson's classic of hotel chains, mergers and shares, for two to
          six. Grow chains with tiles, buy their stock, and cash in when a chain
          is swallowed. The richest player at the end wins.
        </Text>

        <Title order={4}>The chains</Title>
        <Group gap="xs" wrap="wrap">
          {CHAINS.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: CHAIN_COLOUR[c],
                }}
              />{" "}
              {label(c)}
              <Text component="span" size="xs" c="dimmed">
                ({["cheap", "medium", "dear"][TIER[c]]})
              </Text>
            </span>
          ))}
        </Group>
        <Table withTableBorder fz="xs" verticalSpacing={2}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Size</Table.Th>
              <Table.Th>Cheap</Table.Th>
              <Table.Th>Medium</Table.Th>
              <Table.Th>Dear</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {SIZES.map(([name, size]) => (
              <Table.Tr key={name}>
                <Table.Td>{name}</Table.Td>
                <Table.Td>{money(priceOf("LUXOR", size))}</Table.Td>
                <Table.Td>{money(priceOf("AMERICAN", size))}</Table.Td>
                <Table.Td>{money(priceOf("IMPERIAL", size))}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">
          Majority bonus is ten times the share price, minority five times. A
          sole holder takes both; tied holders split.
        </Text>

        <Title order={4}>A turn</Title>
        <List>
          <List.Item>
            <b>Play a tile.</b> Alone, it sits on the board. Next to lone tiles,
            it founds a chain of your choice and you get a free share. Next to
            one chain, it grows it. Next to two or more, they merge.
          </List.Item>
          <List.Item>
            <b>Buy up to three shares</b> of chains on the board, at the current
            price.
          </List.Item>
          <List.Item>
            <b>Draw</b> back up to six tiles.
          </List.Item>
        </List>

        <Title order={4}>Mergers</Title>
        <List>
          <List.Item>
            The largest chain survives; if tied, the player who played the tile
            chooses.
          </List.Item>
          <List.Item>
            Each absorbed chain pays its majority and minority bonuses, then
            every holder, starting with the merging player, sells at the price
            before the merger, trades two shares for one of the survivor, or
            keeps them.
          </List.Item>
          <List.Item>
            A chain of eleven or more is safe and cannot be absorbed. A tile
            that would merge two safe chains can never be played and is
            replaced; one that would found an eighth chain waits.
          </List.Item>
        </List>

        <Title order={4}>The end</Title>
        <List>
          <List.Item>
            On your turn you may call the end once a chain has 41 tiles or every
            chain on the board is safe. Every chain pays its bonuses and all
            shares are sold. Most cash wins.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
