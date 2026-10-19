import { Group, List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace from "./CardFace";
import { CARD_INFO, CARD_TYPES, GROUP_LABEL, GROUP_OF, label } from "../board";

export default function CoralReefRules() {
  return (
    <RulesDrawer title="How to play Ecosystem: Coral Reef">
      <Stack gap="md">
        <Text>
          The Great Barrier Reef edition of Ecosystem, for two to six. Draft the
          creatures of the reef into a grid of twenty, four high by five wide,
          placing each where it will flourish. Score each card, then add a food
          web bonus for keeping producers, prey and predators in balance.
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
            A new card must touch your reef (not diagonally) and keep it within
            four rows and five columns. Once you reach a fourth row or a fifth
            column, you cannot grow further that way.
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
                  <b>{label(t)}</b>
                  {GROUP_OF[t] ? (
                    <Text component="span" size="xs" c="dimmed">
                      {" "}
                      · {GROUP_LABEL[GROUP_OF[t]!]}
                    </Text>
                  ) : (
                    <Text component="span" size="xs" c="dimmed">
                      {" "}
                      · no group
                    </Text>
                  )}
                  : {CARD_INFO[t].rule}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group gap="xs">
          <Text size="sm">
            Adjacent means above, below, left or right. The bottom row is the
            lowest row your reef reaches, so a coral there stays safe only while
            nothing is placed below it. Ties for a plankton place all earn it,
            and nobody takes the place below.
          </Text>
        </Group>

        <Title order={4}>Whales</Title>
        <Text size="sm">
          Before scoring, each whale turns one adjacent card facedown, and that
          card counts for nothing. Here the flips are chosen for you, one whale
          at a time, to cost your reef the least.
        </Text>

        <Title order={4}>The food web bonus</Title>
        <Text size="sm">
          Add up your producers (coral, krill, plankton), your prey (grouper,
          clownfish, crab) and your predators (eel, shark, whale). The lowest of
          the three is added to your score again. Turtles and octopuses stand
          outside the web and simply add their points. Most points wins; ties
          share the win.
        </Text>

        <Title order={4}>Two players</Title>
        <Text size="sm">
          A neutral third hand joins the circle. Each pick it sets one card
          aside face up at random; its plankton compete for the most plankton.
        </Text>

        <Title order={4}>In this app</Title>
        <List>
          <List.Item>
            Tap a card to lift it, tap a glowing cell, then place. An Octopus
            lets you pick up one of your cards and either tap another card to
            swap them or a lit empty cell to move it, before placing.
          </List.Item>
          <List.Item>
            The deck holds 130 cards: 20 krill, 20 plankton, 14 clownfish, 12
            each of coral, crabs and turtles, 10 groupers, 8 each of eels,
            sharks and octopuses, and 6 whales.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
