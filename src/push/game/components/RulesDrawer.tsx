import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace, { Die } from "./CardFace";

export default function PushRules() {
  return (
    <RulesDrawer title="How to play PUSH">
      <Stack gap="md">
        <Text>
          Turn cards over one at a time and sort them into columns. Stop while
          you can and take a column; push one card too far and you take nothing
          and roll the die. The cards in front of you are points, but only the
          ones you protect are safe.
        </Text>

        <Title order={4}>The cards</Title>
        <Group gap="xs">
          {[
            "RED_6",
            "BLUE_5",
            "YELLOW_4",
            "GREEN_3",
            "PURPLE_2",
            "DICE",
            "SWITCH",
          ].map((c) => (
            <CardFace key={c} card={c} width={44} />
          ))}
          <Die face="STAR" size={44} />
        </Group>
        <Text size="sm">
          120 cards: five colours, each with the numbers 1 to 6 three times,
          plus 18 dice cards and 12 switch cards. The die shows the five colours
          and a star. With two players the switch cards stay in the box.
        </Text>

        <Title order={4}>Your turn: push or protect</Title>
        <List>
          <List.Item>
            <b>Push.</b> Turn over the top card and place it in a column, or
            start a new one; you may have up to three columns. A column may
            never hold two cards of the same number or the same colour, and only
            one dice card. After every card you may stop: take one column into
            your zone at once.
          </List.Item>
          <List.Item>
            <b>Too far.</b> If a card fits in no column, discard it, take no
            column, and roll the die: every card of that colour in your zone is
            discarded.
          </List.Item>
          <List.Item>
            <b>The others choose.</b> Starting on your left, each other player
            takes one of the remaining columns. With two players the rest is
            discarded; with more, some get nothing. Then the player on your left
            takes their turn.
          </List.Item>
          <List.Item>
            <b>Protect.</b> Instead of pushing, choose one colour and turn every
            card of it in your zone face down. Those points can never be lost.
            You may protect the same colour again on a later turn.
          </List.Item>
        </List>

        <Title order={4}>The dice card</Title>
        <Text size="sm">
          Taking a column with a dice card means a roll, after its numbered
          cards have joined your zone: every card of the colour rolled is
          discarded, the ones you just took included. The star spares
          everything, and protected cards are always safe.
        </Text>

        <Title order={4}>The switch card</Title>
        <Text size="sm">
          A switch card goes aside, not into a column. If an odd number were
          turned over during the turn, the others choose starting on the right
          instead of the left. The order of turns never changes.
        </Text>

        <Title order={4}>The end</Title>
        <Text size="sm">
          When the deck is gone and the last columns have been chosen, add up
          the numbers on every card in your zone and your protected pile. The
          most points wins; on a tie, the most cards; then the win is shared.
        </Text>

        <Title order={4}>In this app</Title>
        <List>
          <List.Item>
            A card with only one legal place is placed for you; otherwise tap a
            glowing column or the new-column slot.
          </List.Item>
          <List.Item>
            Tapping a column while it is your turn stops and takes it. The die
            tumbles over the table so nobody misses a roll.
          </List.Item>
          <List.Item>
            The rulebook's "Risks" variant, where the star costs the whole zone,
            is not offered.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
