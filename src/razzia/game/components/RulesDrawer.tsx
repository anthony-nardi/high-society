import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import LootCard from "./LootCard";
import {
  BODYGUARD_EFFECT,
  BUSINESS_EFFECT,
  CAR_EFFECT,
  CATEGORY_CARDS,
  COIN_EFFECT,
  DRIVER_EFFECT,
  JEWEL_EFFECT,
  POLICE_EFFECT,
  THIEF_EFFECT,
} from "../cardInfo";
import type { LootCards } from "../types";

/** One scoring rule with the cards it applies to drawn beside it. */
function LegendRow({
  title,
  cards,
  text,
}: {
  title: string;
  cards: LootCards[];
  text: string;
}) {
  return (
    <Stack gap={4}>
      <Text fw={600} size="sm">
        {title}
      </Text>
      <Group gap={4} wrap="wrap" align="flex-start">
        {cards.map((card) => (
          <LootCard key={card} card={card} width={46} caption />
        ))}
      </Group>
      <Text size="sm" c="dimmed">
        {text}
      </Text>
    </Stack>
  );
}

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
            Each player starts with a set of numbered cheques. The 1 sits in the
            centre.
          </List.Item>
          <List.Item>
            A bid is one cheque. The winner pays it into the centre and takes
            the cheque that was there, face down until next round.
          </List.Item>
          <List.Item>
            Once you have used all your cheques for the round you sit out until
            it ends.
          </List.Item>
        </List>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            Reveal a card: loot joins the table. The seventh loot card starts an
            automatic auction, and if nobody bids all seven are discarded.
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
        </List>

        <Title order={4}>The cards and how they score</Title>
        <Text size="sm" c="dimmed">
          Hover over or tap any card in the game for the same explanation.
        </Text>
        <LegendRow
          title="Jewels (scored every round)"
          cards={CATEGORY_CARDS.jewels}
          text={JEWEL_EFFECT}
        />
        <LegendRow
          title="Bodyguards (scored every round)"
          cards={CATEGORY_CARDS.bodyguards}
          text={BODYGUARD_EFFECT}
        />
        <LegendRow
          title="Coins (scored every round)"
          cards={CATEGORY_CARDS.coins}
          text={COIN_EFFECT}
        />
        <LegendRow
          title="Cars and drivers (scored every round)"
          cards={[...CATEGORY_CARDS.cars, ...CATEGORY_CARDS.drivers]}
          text={`Car: ${CAR_EFFECT} Driver: ${DRIVER_EFFECT}`}
        />
        <LegendRow
          title="Thieves"
          cards={CATEGORY_CARDS.theives}
          text={THIEF_EFFECT}
        />
        <LegendRow
          title="Businesses (scored at the end of the game)"
          cards={CATEGORY_CARDS.businesses}
          text={BUSINESS_EFFECT}
        />
        <LegendRow
          title="Police raid"
          cards={["POLICE_RAIDS"]}
          text={POLICE_EFFECT}
        />

        <Title order={4}>End of the game</Title>
        <List>
          <List.Item>
            After round three, businesses score as above, and the player with
            the most money in cheques scores +5 while the least scores −5.
          </List.Item>
          <List.Item>Highest total wins. Ties share the win.</List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
