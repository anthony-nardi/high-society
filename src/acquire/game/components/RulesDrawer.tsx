import { Group, List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { CHAIN_COLOUR, CHAINS, label, money, priceOf, TIER } from "../board";

const SIZES: [string, number][] = [
  ["2", 2],
  ["3", 3],
  ["4", 4],
  ["5", 5],
  ["6 to 10", 6],
  ["11 to 20", 11],
  ["21 to 30", 21],
  ["31 to 40", 31],
  ["41 and up", 41],
];

const LONE = "#9aa0ad";
const EMPTY = "rgba(255,255,255,0.08)";

type Cell = { fill: string; mark?: string; outline?: boolean };

/** A tiny strip of board squares with the played tile outlined in gold. */
function Strip({ cells, caption }: { cells: Cell[]; caption: string }) {
  const size = 22;
  const gap = 3;
  const width = cells.length * (size + gap);
  return (
    <Stack gap={2} align="center" style={{ minWidth: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${size + 4}`}
        width={width}
        height={size + 4}
        role="img"
        aria-label={caption}
      >
        {cells.map((cell, i) => (
          <g key={i}>
            <rect
              x={i * (size + gap) + 1}
              y="2"
              width={size}
              height={size}
              rx="4"
              fill={cell.fill}
              stroke={cell.outline ? "#ffd86b" : "rgba(0,0,0,0.5)"}
              strokeWidth={cell.outline ? 2.5 : 1}
              strokeDasharray={cell.outline ? "3 2" : undefined}
            />
            {cell.mark && (
              <text
                x={i * (size + gap) + 1 + size / 2}
                y={2 + size / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="#fff"
              >
                {cell.mark}
              </text>
            )}
          </g>
        ))}
      </svg>
      <Text size="xs" c="dimmed" ta="center">
        {caption}
      </Text>
    </Stack>
  );
}

function Swatch({ chain }: { chain: keyof typeof CHAIN_COLOUR }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 11,
        height: 11,
        borderRadius: 3,
        background: CHAIN_COLOUR[chain],
        verticalAlign: "middle",
        marginRight: 4,
      }}
    />
  );
}

export default function AcquireRules() {
  const T = CHAIN_COLOUR.TOWER;
  const L = CHAIN_COLOUR.LUXOR;
  return (
    <RulesDrawer title="How to play Acquire">
      <Stack gap="md">
        <Text>
          You are an investor. Tiles build hotel chains on the board, you buy
          shares in them, and when one chain swallows another, its biggest
          shareholders are paid. Whoever has the most money at the end wins.
        </Text>

        <Title order={4}>Your turn, in three steps</Title>
        <List type="ordered">
          <List.Item>
            <b>Play one tile</b> from your hand of six onto its square. What it
            does depends on its neighbours (see below).
          </List.Item>
          <List.Item>
            <b>Buy up to three shares</b>, in any mix, of chains that are on the
            board, at today's price.
          </List.Item>
          <List.Item>
            <b>Draw</b> a new tile so you hold six again.
          </List.Item>
        </List>

        <Title order={4}>What a tile does</Title>
        <Group gap="lg" justify="center" wrap="wrap">
          <Strip
            cells={[
              { fill: EMPTY },
              { fill: EMPTY, outline: true },
              { fill: EMPTY },
            ]}
            caption="No neighbours: it just sits there"
          />
          <Strip
            cells={[
              { fill: LONE },
              { fill: EMPTY, outline: true },
              { fill: EMPTY },
            ]}
            caption="Next to a lone tile: founds a chain, you get one free share"
          />
          <Strip
            cells={[
              { fill: T, mark: "T" },
              { fill: T, mark: "T" },
              { fill: EMPTY, outline: true },
            ]}
            caption="Next to one chain: the chain grows"
          />
          <Strip
            cells={[
              { fill: T, mark: "T" },
              { fill: T, mark: "T" },
              { fill: EMPTY, outline: true },
              { fill: L, mark: "L" },
            ]}
            caption="Between two chains: a merger"
          />
        </Group>
        <Text size="sm" c="dimmed">
          The table marks each tile in your hand with what it would do, and the
          dashed outlines on the board show where your tiles would go.
        </Text>

        <Title order={4}>The chains and their prices</Title>
        <Text size="sm">
          Seven chains in three price bands. A share costs more as the chain
          grows and more in a dearer band.
        </Text>
        <Group gap="sm" wrap="wrap">
          {CHAINS.map((c) => (
            <Text key={c} size="xs">
              <Swatch chain={c} />
              {label(c)}{" "}
              <Text component="span" c="dimmed">
                ({["cheap", "medium", "dear"][TIER[c]]})
              </Text>
            </Text>
          ))}
        </Group>
        <Table withTableBorder fz="xs" verticalSpacing={2}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Chain size</Table.Th>
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

        <Title order={4}>Mergers, step by step</Title>
        <List type="ordered">
          <List.Item>
            <b>The bigger chain survives.</b> If the biggest are the same size,
            the player who played the tile picks the survivor.
          </List.Item>
          <List.Item>
            <b>The swallowed chain pays bonuses.</b> Whoever holds the most of
            its shares gets the majority bonus, ten times the share price. The
            second-most holder gets the minority bonus, five times the price. If
            one person holds all of it they get both. Tied holders split the
            bonuses between them.
          </List.Item>
          <List.Item>
            <b>Every holder settles their shares</b>, starting with the player
            who caused the merger and going round the table. For each share you
            may <b>sell</b> it at the price it had just before the merger,
            <b> trade</b> two of them for one share of the survivor, or{" "}
            <b>keep</b> it for the day the chain is founded again.
          </List.Item>
          <List.Item>
            <b>The tiles join the survivor</b>, which is now bigger and dearer.
            The swallowed chain can be founded again later.
          </List.Item>
        </List>
        <Text size="sm" c="dimmed">
          Example: Tower has four tiles, so a share is $400. You hold five
          Tower, a rival holds two. Tower is swallowed: you get $4,000, your
          rival $2,000, and you can then sell your five for $400 each.
        </Text>

        <Title order={4}>Safe chains and stuck tiles</Title>
        <List>
          <List.Item>
            A chain with <b>eleven or more tiles is safe</b>: it can never be
            swallowed. It still grows, and it can swallow others.
          </List.Item>
          <List.Item>
            A tile that would merge <b>two safe chains</b> can never be played.
            It is swapped for a new one when you draw.
          </List.Item>
          <List.Item>
            A tile that would found an <b>eighth chain</b> waits in your hand
            until a merger frees a chain.
          </List.Item>
          <List.Item>
            If none of your tiles can be played, you skip straight to buying.
          </List.Item>
        </List>

        <Title order={4}>Ending and scoring</Title>
        <List>
          <List.Item>
            On your turn you may <b>call the end</b> once any chain has 41
            tiles, or every chain on the board is safe. Nobody has to call it.
          </List.Item>
          <List.Item>
            Then every chain pays its majority and minority bonuses as if it
            were swallowed, and all shares are sold at today's prices.
          </List.Item>
          <List.Item>Most cash wins.</List.Item>
        </List>

        <Title order={4}>Good to know</Title>
        <List>
          <List.Item>
            Everyone can see who holds which shares. Only your cash and your
            tiles are private.
          </List.Item>
          <List.Item>
            Each chain has 25 shares. When the bank runs out, nobody can buy
            more until some are sold or traded back.
          </List.Item>
          <List.Item>
            Shares in a swallowed chain that you keep are worth nothing until
            that chain is founded again.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
