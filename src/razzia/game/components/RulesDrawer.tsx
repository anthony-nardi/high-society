import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function RazziaRules() {
  return (
    <RulesDrawer title="How to play Razzia!">
      <Stack gap="md">
        <Text>
          Gangsters bid for loot over three rounds. Reveal cards onto the table,
          call an auction when the pile is worth it, and watch the police: the
          seventh police card ends the round with the loot still on the table.
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
            Reveal a card: loot joins the table. The seventh loot card starts an
            automatic auction, and if nobody bids all seven are discarded. A
            police card forces an auction instead, and the seventh police card
            of the round ends it at once.
          </List.Item>
          <List.Item>
            Call an auction, even with nothing on the table: everyone after you
            bids once or passes, and you bid last. If nobody else bid you must
            bid yourself.
          </List.Item>
          <List.Item>
            Use a thief: take any one card straight from the table per thief, as
            many thieves as you like at once.
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
            Businesses: 1 point per kind up to 6, all 7 kinds 10, plus 3 of a
            kind +5 and 4 of a kind +10.
          </List.Item>
          <List.Item>Most money +5, least money −5.</List.Item>
          <List.Item>Highest total wins. Ties share the win.</List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
