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
        <Text fs="italic">
          Night falls and the gangsters gather to divide up the city, but time
          is against them. At dawn, with the arrival of the sun, the police will
          impose justice!
        </Text>
        <Text>
          Each player is the capo of a Mafia family with three Money tokens to
          spend in each of three rounds (four with three players). Win auctions
          for loot, but do not wait too long: as soon as seven police raids have
          been revealed the round is over at once. The most points after three
          rounds wins.
        </Text>

        <Title order={4}>Money tokens</Title>
        <List>
          <List.Item>
            Each player is dealt a set of Money tokens at random. The 1,000
            token starts face up on the board.
          </List.Item>
          <List.Item>
            A bid is one Money token. The winner places it on the board and
            takes the token that was there, face down until the next round.
          </List.Item>
          <List.Item>
            Once you have used all your Money tokens for the round you take no
            more turns until it ends.
          </List.Item>
          <List.Item>
            The player holding the highest Money token starts each round.
          </List.Item>
        </List>

        <Title order={4}>Your turn: one of three actions</Title>
        <List>
          <List.Item>
            <b>Reveal a card.</b> Loot goes face up next to the board. A police
            raid interrupts the game for a normal auction. The seventh loot card
            on the table triggers an automatic normal auction, and if nobody
            bids all seven are returned to the box.
          </List.Item>
          <List.Item>
            <b>Play a thief.</b> Take any face-up loot card from the table. Use
            as many thieves as you like at once; each is discarded.
          </List.Item>
          <List.Item>
            <b>Call a court-ordered auction.</b> Same as a normal auction,
            except that if everyone else passes you must bid. Useful with only
            one or two loot cards out, to put pressure on the high tokens.
          </List.Item>
        </List>

        <Title order={4}>Auctions</Title>
        <List>
          <List.Item>
            Starting left of the player who revealed the police raid or called
            the auction, each player bids one Money token higher than the
            current bid, or passes. The player who started it bids last.
          </List.Item>
          <List.Item>
            The highest bidder takes all the loot on the table and the Money
            token on the board. Everyone else takes their token back. police
            raids stay out.
          </List.Item>
          <List.Item>
            If everyone passes a normal auction, the loot stays on the table.
          </List.Item>
        </List>

        <Title order={4}>The cards and how they score</Title>
        <Text size="sm" c="dimmed">
          Hover over or tap any card in the game for the same explanation.
        </Text>
        <LegendRow
          title="Jewels (every round)"
          cards={CATEGORY_CARDS.jewels}
          text={JEWEL_EFFECT}
        />
        <LegendRow
          title="Bodyguards (every round)"
          cards={CATEGORY_CARDS.bodyguards}
          text={BODYGUARD_EFFECT}
        />
        <LegendRow
          title="Gold coins (every round)"
          cards={CATEGORY_CARDS.coins}
          text={COIN_EFFECT}
        />
        <LegendRow
          title="Cars and drivers (every round)"
          cards={[...CATEGORY_CARDS.cars, ...CATEGORY_CARDS.drivers]}
          text={`Car: ${CAR_EFFECT} Driver: ${DRIVER_EFFECT}`}
        />
        <LegendRow
          title="Thieves"
          cards={CATEGORY_CARDS.theives}
          text={THIEF_EFFECT}
        />
        <LegendRow
          title="Businesses (end of the game)"
          cards={CATEGORY_CARDS.businesses}
          text={BUSINESS_EFFECT}
        />
        <LegendRow
          title="Police raids"
          cards={["POLICE_RAIDS"]}
          text={POLICE_EFFECT}
        />

        <Title order={4}>End of the game</Title>
        <List>
          <List.Item>
            After the third round, businesses score as above. Each player also
            adds up all their Money tokens, revealed and hidden: the highest sum
            scores +5 and the lowest −5, ties sharing.
          </List.Item>
          <List.Item>The most points wins. Ties share the win.</List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
