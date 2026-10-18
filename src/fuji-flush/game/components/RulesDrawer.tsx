import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import CardFace from "./CardFace";
import { DISTRIBUTION } from "../board";

export default function FujiFlushRules() {
  const counts = Object.entries(DISTRIBUTION)
    .map(([card, n]) => `${n}× ${card}`)
    .join(", ");
  return (
    <RulesDrawer title="How to play Fuji Flush">
      <Stack gap="md">
        <Text>
          A fast card game by Friedemann Friese for 3 to 8 players. Be the first
          to get rid of all your cards: play a card in front of you and hope it
          is still there when your turn comes round again.
        </Text>

        <Title order={4}>The cards</Title>
        <Group gap="xs" wrap="wrap">
          {[2, 5, 8, 12, 16, 20].map((c) => (
            <CardFace key={c} card={c} width={48} />
          ))}
        </Group>
        <List>
          <List.Item>
            90 cards numbered 2 to 20. Low numbers are common, high ones rare:{" "}
            {counts}.
          </List.Item>
          <List.Item>
            Everyone is dealt 6 cards, or 5 at a table of 7 or 8. The rest form
            a face-down stack; flushed cards go face up on the drain.
          </List.Item>
        </List>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            Play any one card from your hand face up in front of you. There is
            no restriction on which number you may play.
          </List.Item>
          <List.Item>
            If your number is higher than the value of a card lying in front of
            another player, you beat it: that player flushes their card down the
            drain and draws a replacement from the stack. Cards of the same or a
            higher value are not affected.
          </List.Item>
          <List.Item>
            If your card is still in front of you at the start of your next
            turn, you have pushed it through: discard it without drawing. One
            card fewer. Then play your next card.
          </List.Item>
        </List>

        <Title order={4}>Joining forces</Title>
        <List>
          <List.Item>
            If you play a number that already lies in front of one or more
            players, the numbers are added together and every one of those cards
            is now worth the total: two 7s are worth 14, three are 21.
          </List.Item>
          <List.Item>
            A team beats and is beaten as one. If a higher value appears, the
            whole team flushes.
          </List.Item>
          <List.Item>
            Only matching numbers join. A 14 played against two 7s is not added
            to them: it ties their 14, so neither side is flushed.
          </List.Item>
          <List.Item>
            When a team member pushes their card through, everyone with that
            number discards theirs too, without drawing. You helped each other,
            so you all get rid of your cards.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>
            The moment you push your last card through, with nothing left in
            your hand, you win. That can happen on another player's turn, and a
            team can win together.
          </List.Item>
          <List.Item>
            Should the stack run out, the drain is shuffled into a new one.
          </List.Item>
        </List>

        <Title order={4}>Bots</Title>
        <Text>
          A bot weighs each card by the chance it survives until it is pushed
          through, counting the opponents who play before it is safe, plus the
          turns it costs everyone it flushes, less the help it lends the team it
          joins. When nothing can survive it dumps its lowest card.
        </Text>
      </Stack>
    </RulesDrawer>
  );
}
