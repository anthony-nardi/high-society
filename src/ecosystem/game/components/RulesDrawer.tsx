import { Group, List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace from "./CardFace";
import { CARD_INFO, CARD_TYPES, label } from "../board";

export default function EcosystemRules() {
  return (
    <RulesDrawer title="How to play Ecosystem">
      <Stack gap="md">
        <Text>
          Matt Simpson's drafting game for two to six. Draft animals and
          landforms into a grid of twenty, four high by five wide, placing each
          where it will flourish. The richest ecosystem wins, and biodiversity
          pays while monocultures are punished.
        </Text>

        <Title order={4}>Drafting</Title>
        <List>
          <List.Item>
            Everyone holds ten cards. At the same time, each player keeps one,
            places it, and passes the rest to the left.
          </List.Item>
          <List.Item>
            After ten picks, ten new cards each: round two passes to the right.
          </List.Item>
          <List.Item>
            A new card must touch your ecosystem (not diagonally) and keep it
            within four rows and five columns. Once you reach a fourth row or a
            fifth column, you cannot grow further that way.
          </List.Item>
        </List>

        <Title order={4}>The cards</Title>
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
        <Group gap="xs">
          <Text size="sm">
            Adjacent means above, below, left or right. "Within 2 spaces" for
            the eagle includes diagonals. A dragonfly counts each touching
            stream once, by the whole connected length. Ties for a stream or
            wolf place all earn it, and nobody takes the place below.
          </Text>
        </Group>

        <Title order={4}>Diversity</Title>
        <Text size="sm">
          Count the card types that scored at least a point, stream and wolf
          placings included: 5 or fewer −5, six 0, seven +3, eight +7, nine or
          more +12.
        </Text>

        <Title order={4}>Two players</Title>
        <Text size="sm">
          A neutral third hand joins the circle. Each pick it sets one card
          aside face up at random; those cards compete for the longest stream
          (all of its streams count as connected) and the most wolves.
        </Text>

        <Title order={4}>In this app</Title>
        <List>
          <List.Item>
            Tap a card to lift it, tap a glowing cell, then place. A Rabbit lets
            you tap two of your cards to swap before placing.
          </List.Item>
          <List.Item>
            The deck holds 130 cards: 20 meadows, 20 streams, 12 each of bears,
            deer, foxes and wolves, 10 trout, and 8 each of bees, dragonflies,
            eagles and rabbits.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
