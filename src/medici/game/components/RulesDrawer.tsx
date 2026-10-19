import { List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace from "./CardFace";
import { COMMODITIES, PAYMENTS } from "../board";

export default function MediciRules() {
  return (
    <RulesDrawer title="How to play Medici">
      <Stack gap="md">
        <Text>
          You are buyers for the merchant houses of Florence. Over three days
          you bid for lots of cloth, spice, grain, dye and fur at the wholesale
          market and load them onto your ship. Each evening the most valuable
          ships are paid, and whoever has bought most of each commodity is paid
          again. The florins you bid with are also your score: the richest house
          after three days wins.
        </Text>

        <Title order={4}>The cards</Title>
        <Text size="sm">
          Thirty-six cards: each of the five commodities has seven, valued 0, 1,
          2, 3, 4, 5 and 5, and there is one gold card worth 10. Each day a
          fresh deck is dealt from all thirty-six: 18 cards with two or three
          players, six per player with more; the rest are set aside unseen.
        </Text>
        <Table withTableBorder fz="xs" verticalSpacing={4}>
          <Table.Tbody>
            <Table.Tr>
              {COMMODITIES.map((c) => (
                <Table.Td key={c} style={{ width: 52 }}>
                  <CardFace card={`${c}_5`} width={40} />
                </Table.Td>
              ))}
              <Table.Td style={{ width: 52 }}>
                <CardFace card="GOLD_10" width={40} />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Title order={4}>A turn</Title>
        <List>
          <List.Item>
            The holder of the first player card turns over the top card of the
            deck, and may turn over a second and a third. The cards form one
            lot, never split. A lot may not be bigger than the roomiest hold at
            the table can take.
          </List.Item>
          <List.Item>
            Bidding starts on the auctioneer's left and goes once round the
            table: each player either bids more than the last bid or passes, and
            the auctioneer speaks last. A bid is at least 1 florin and never
            more than you have.
          </List.Item>
          <List.Item>
            The highest bidder pays the bank and loads the whole lot. If nobody
            bids, the lot is discarded. Then the first player card passes to the
            left.
          </List.Item>
          <List.Item>
            A hold takes five cards (seven with two players). You cannot bid on
            a lot that would not fit, and once your hold is full you sit out the
            rest of the day.
          </List.Item>
        </List>

        <Title order={4}>The day ends</Title>
        <Text size="sm">
          When every hold but one is full, the last ship afloat fills up from
          the top of the deck for nothing, taking the cards as they come. The
          day also ends when the deck runs out, in which case some holds sail
          part empty.
        </Text>

        <Title order={4}>The evening's payouts</Title>
        <List>
          <List.Item>
            <b>Ships.</b> Add up the values aboard. The most valuable ship is
            paid most; the least gets nothing. Tied ships add their payments
            together and share them, rounded down.
          </List.Item>
          <List.Item>
            <b>Tracks.</b> For each commodity, move up that track by the number
            of its cards aboard (the gold card counts for no track). Then the
            highest on each track is paid 10 and the second 5 (nothing with two
            players); ties share. Everyone starts on the gold frame at the foot
            of each track and can still tie for the awards there.
          </List.Item>
          <List.Item>
            <b>Bonuses.</b> Standing on the top three levels of a track pays 5,
            10 or 20 every evening, and ties pay everyone in full. The tracks
            are never reset: what you buy on day one keeps paying.
          </List.Item>
        </List>
        <Table withTableBorder fz="xs" verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Players</Table.Th>
              <Table.Th>Ship payments, best first</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {[2, 3, 4, 5, 6].map((n) => (
              <Table.Tr key={n}>
                <Table.Td>{n}</Table.Td>
                <Table.Td>{PAYMENTS[n].join(" · ")}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="sm">
          Then the ships are emptied, all thirty-six cards are shuffled for a
          new deck, and the poorest player takes the first player card. After
          the third evening the richest house wins; ties share the win.
        </Text>

        <Title order={4}>Money</Title>
        <Text size="sm">
          Two to four players start with 40 florins, five or six with 30. You
          can never go below zero or borrow. Spend to fill your ship and climb
          the tracks, but remember that every florin spent is a point lost.
        </Text>

        <Title order={4}>In this app</Title>
        <List>
          <List.Item>
            Players who cannot fit the lot or cannot afford a florin more are
            passed over automatically.
          </List.Item>
          <List.Item>
            The counters on the tracks show where tonight's cargo will put you;
            the day's ledger opens each evening and can be reopened from the
            table.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
