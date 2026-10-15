import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function NoThanksRules() {
  return (
    <RulesDrawer title="How to play No Thanks!">
      <Stack gap="md">
        <Text>
          Cards are points, and points are bad. Pay chips to avoid cards, but
          every chip you spend is a point you give away. Lowest score wins.
        </Text>

        <Title order={4}>Setup</Title>
        <List>
          <List.Item>
            The deck holds the cards 3 to 35. Nine are removed unseen, so nobody
            knows which cards will never appear.
          </List.Item>
          <List.Item>
            Everyone starts with 11 chips (9 with six players, 7 with seven).
            Chips stay hidden from the other players.
          </List.Item>
        </List>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            Either take the face-up card together with every chip on it, or
            place one of your chips on it to pass it to the next player.
          </List.Item>
          <List.Item>With no chips left you must take the card.</List.Item>
          <List.Item>
            Whoever takes the card also takes the next turn with the new card.
          </List.Item>
        </List>

        <Title order={4}>Scoring</Title>
        <List>
          <List.Item>Each card scores its face value.</List.Item>
          <List.Item>
            A run of consecutive cards only scores its lowest card, so a 7 next
            to your 8 and 9 is free, and a 9 bridging 8 and 10 saves you points.
          </List.Item>
          <List.Item>Every chip you still hold is one point off.</List.Item>
          <List.Item>
            The game ends when the last card is taken. Lowest score wins; ties
            share the win.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
