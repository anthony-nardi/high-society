import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function RazziaRules() {
  return (
    <RulesDrawer title="How to play Razzia!">
      <Stack gap="md">
        <Text>
          Gangsters bid for loot over three rounds. Reveal cards onto the table,
          call an auction when the pile is worth it, and watch the police: too
          many raids end the round with the loot still on the table.
        </Text>

        <Title order={4}>Money</Title>
        <List>
          <List.Item>
            Each player starts with a set of numbered money cards. The 1 sits in
            the centre.
          </List.Item>
          <List.Item>
            A bid is one money card. The winner pays it into the centre and
            takes the card that was there, face down until next round.
          </List.Item>
          <List.Item>
            Once you have used all your money for the round you sit out until it
            ends.
          </List.Item>
        </List>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            Reveal a card: loot joins the table (up to 7). A police raid forces
            an auction instead, and the final raid of the round ends it at once.
          </List.Item>
          <List.Item>
            Call an auction: everyone after you bids once or passes, and you bid
            last. If nobody else bid you must bid yourself.
          </List.Item>
          <List.Item>
            Use a thief: take one card straight from the table per thief.
          </List.Item>
          <List.Item>
            In a forced auction the player who drew the raid bids last and may
            pass; if nobody bids the loot stays.
          </List.Item>
        </List>

        <Title order={4}>Scoring each round</Title>
        <List>
          <List.Item>
            Jewels: 3 kinds +5, 4 kinds +10, all 5 +15. No jewels −5.
          </List.Item>
          <List.Item>
            Bodyguards: most +5, fewest −2. Kept between rounds.
          </List.Item>
          <List.Item>Coins: +3 each.</List.Item>
          <List.Item>
            Cars: +1 each, but only with a driver. Drivers: +1 each. Cars are
            kept, drivers are not.
          </List.Item>
          <List.Item>Unused thieves: +2 each.</List.Item>
        </List>

        <Title order={4}>End of the game</Title>
        <List>
          <List.Item>
            Businesses: 1 point per kind, 6 kinds +10, all 7 +15, plus 3, 4 or 5
            of a kind +5, +10, +15.
          </List.Item>
          <List.Item>Most money +5, least money −5.</List.Item>
          <List.Item>Highest total wins. Ties share the win.</List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
