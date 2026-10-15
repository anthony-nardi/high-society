import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function HighSocietyRules() {
  return (
    <RulesDrawer title="How to play High Society">
      <Stack gap="md">
        <Text>
          Outbid your rivals for luxury and recognition while keeping enough
          money in hand. The highest score wins, but the player with the least
          money left at the end is out of the running no matter what they own.
        </Text>

        <Title order={4}>Your money</Title>
        <Text>
          Everyone starts with the same 11 money cards: 1, 2, 3, 4, 6, 8, 10,
          12, 15, 20 and 25. There is no change. A bid is a set of cards, and
          you can add more cards to your bid on later turns.
        </Text>

        <Title order={4}>Luxury and Recognition cards</Title>
        <List>
          <List.Item>
            Luxury cards 1 to 10 are worth their number in points.
          </List.Item>
          <List.Item>
            Recognition (2x) doubles your score. There are three.
          </List.Item>
          <List.Item>
            Each player in turn must raise the highest bid or pass. Passing
            returns your bid to your hand.
          </List.Item>
          <List.Item>
            The last player still bidding wins the card and pays their bid.
          </List.Item>
        </List>

        <Title order={4}>Misfortune cards</Title>
        <Text>
          Scandal (−5), Mansion fire (½) and the Thief (−) work the other way
          round: nobody wants them.
        </Text>
        <List>
          <List.Item>
            The first player to pass takes the card and keeps their money.
          </List.Item>
          <List.Item>
            Everyone who bid before that loses the money they bid.
          </List.Item>
          <List.Item>
            The Thief discards your lowest luxury card, or the next luxury card
            you win if you have none.
          </List.Item>
        </List>

        <Title order={4}>End of the game</Title>
        <List>
          <List.Item>
            Four cards have green edges: the three Recognition cards and the
            Mansion fire. The moment the fourth is revealed the game ends, and
            that card is not auctioned.
          </List.Item>
          <List.Item>
            The player (or players) with the least money left is eliminated.
          </List.Item>
          <List.Item>
            Of the rest, the highest score wins. Ties go to the most money left,
            then the highest luxury card.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
