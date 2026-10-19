import { List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace from "./CardFace";
import { CARD_INFO, CARD_TYPES, DECK_COUNTS, label } from "../board";

export default function SavannaRules() {
  return (
    <RulesDrawer title="How to play Ecosystem: Savanna">
      <Stack gap="md">
        <Text>
          The Serengeti edition of Ecosystem, for two to six. Draft the animals
          and landforms of the savanna into a grid of twenty, four high by five
          wide, placing each where it will flourish. Hunters flip their prey at
          scoring time, and the scavengers feed on what is left.
        </Text>

        <Title order={4}>Drafting</Title>
        <List>
          <List.Item>
            Everyone holds eleven cards. At the same time, each player keeps
            one, places it, and passes the rest to the left. After ten picks the
            eleventh card is set aside.
          </List.Item>
          <List.Item>
            Then eleven new cards each: round two passes to the right.
          </List.Item>
          <List.Item>
            A new card must touch your ecosystem (not diagonally) and keep it
            within four rows and five columns. Once you reach a fourth row or a
            fifth column, you cannot grow further that way.
          </List.Item>
        </List>

        <Title order={4}>The cards, in scoring order</Title>
        <Table withTableBorder fz="xs" verticalSpacing={4}>
          <Table.Tbody>
            {CARD_TYPES.map((t) => (
              <Table.Tr key={t}>
                <Table.Td style={{ width: 52 }}>
                  <CardFace type={t} size={38} />
                </Table.Td>
                <Table.Td>
                  <b>{label(t)}</b>: {CARD_INFO[t].rule}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="sm">
          Adjacent means above, below, left or right. Cards are scored in the
          order above: cheetahs flip the gazelles they score, then each lion
          beside a grassland flips one faceup gazelle or zebra and scores 4.
          Flipped cards count for nothing except as food for hyenas and
          vultures, and they no longer trouble elephants. Here each lion's flip
          is chosen for you to feed your scavengers best.
        </Text>

        <Title order={4}>Two players</Title>
        <Text size="sm">
          A neutral third hand joins the circle. Each pick it sets one card
          aside face up at random; its gazelles compete for the most gazelles.
        </Text>

        <Title order={4}>In this app</Title>
        <List>
          <List.Item>
            Tap a card to lift it, tap a glowing cell, then place. Your running
            score already shows the flips as they would fall.
          </List.Item>
          <List.Item>
            The deck holds 132 cards. The rulebook does not print the split
            between the eleven types, so this app uses{" "}
            {CARD_TYPES.map(
              (t) => `${DECK_COUNTS[t]} ${label(t).toLowerCase()}`,
            ).join(", ")}
            , modelled on the Ecosystem and Coral Reef decks.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
