import { Group, List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace from "./CardFace";
import { Card } from "../types";
import { CARD_HELP, CARD_LABEL } from "../board";

const SPECIALS: [Card, number][] = [
  ["DRUMMER", 6],
  ["HEROINE", 3],
  ["SPRING", 3],
  ["WINTER", 3],
  ["BISHOP", 6],
  ["SCARECROW", 16],
  ["COURTESAN", 12],
  ["SURRENDER", 3],
];

export default function CondottiereRules() {
  return (
    <RulesDrawer title="How to play Condottiere">
      <Stack gap="md">
        <Text>
          Dominique Ehrhard's game of Renaissance mercenaries, for two to six.
          Hire armies from your hand to win battles for the cities of Italy. Win
          five regions, or three that touch, and you rule.
        </Text>

        <Title order={4}>The goal</Title>
        <List>
          <List.Item>
            With four or more players: five regions in all, or three adjacent.
          </List.Item>
          <List.Item>
            With two or three players: six in all, or four adjacent.
          </List.Item>
          <List.Item>
            The seventeen regions follow the Fantasy Flight board, from Torino
            to Napoli, redrawn for this app.
          </List.Item>
        </List>

        <Title order={4}>A battle</Title>
        <List type="ordered">
          <List.Item>
            Whoever holds the <b>Condottiere</b> picks an unclaimed region
            without the Pope, and plays first.
          </List.Item>
          <List.Item>
            In turn, play one card into your line or <b>pass</b>. Once you pass
            you are out of this battle.
          </List.Item>
          <List.Item>
            When everyone has passed, or a Surrender is played, the strongest
            line wins the region. A tie means nobody takes it.
          </List.Item>
          <List.Item>
            The winner takes the Condottiere, unless someone has the most
            Courtesans in their line: then they take it.
          </List.Item>
        </List>

        <Title order={4}>The cards</Title>
        <Group gap="xs" wrap="wrap">
          {(["M1", "M3", "M6", "M10"] as Card[]).map((c) => (
            <CardFace key={c} card={c} width={40} />
          ))}
        </Group>
        <Text size="sm">
          Mercenaries add their strength: ten 1s, and eight each of 2, 3, 4, 5,
          6 and 10. The rest change the fight.
        </Text>
        <Table withTableBorder fz="xs" verticalSpacing={4}>
          <Table.Tbody>
            {SPECIALS.map(([card, count]) => (
              <Table.Tr key={card}>
                <Table.Td style={{ width: 52 }}>
                  <CardFace card={card} width={36} />
                </Table.Td>
                <Table.Td>
                  <b>
                    {CARD_LABEL[card]} ×{count}
                  </b>
                  <br />
                  {CARD_HELP[card]}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">
          Strength is worked out at the end: a Drummer doubles first, then
          Spring adds 3 to each of your strongest mercenaries. Under Winter
          every mercenary is 1, doubled to 2 by a Drummer.
        </Text>

        <Title order={4}>New hands</Title>
        <List>
          <List.Item>
            After a battle, if no more than one player still has cards, every
            hand is discarded and everyone is dealt ten new cards plus one for
            each region they hold.
          </List.Item>
          <List.Item>A player with no cards sits out until then.</List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
