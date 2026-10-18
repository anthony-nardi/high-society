import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function TwixtRules() {
  return (
    <RulesDrawer title="How to play TwixT">
      <Stack gap="md">
        <Text>
          Alex Randolph's connection game for two. Red joins the top edge to the
          bottom, Black the left edge to the right, with a chain of pegs linked
          by knight's moves. The first unbroken chain wins.
        </Text>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            Place one peg in any empty hole, except in the other player's two
            border rows.
          </List.Item>
          <List.Item>
            Every one of your pegs a knight's move away (two holes one way, one
            hole the other) is linked to the new peg at once, unless the link
            would cross a link already on the board. Links never cross, yours or
            theirs.
          </List.Item>
          <List.Item>
            You may remove any of your own links during your turn, to make room
            for a link elsewhere. Tap a link, then confirm.
          </List.Item>
        </List>

        <Title order={4}>The swap</Title>
        <Text size="sm">
          Red pegs first. Black may then take over Red, inheriting that first
          peg, instead of playing a peg. It keeps the first move honest: too
          strong a first peg and your opponent takes it.
        </Text>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>
            Join your two borders with a chain of linked pegs and you win at
            once; the chain lights up.
          </List.Item>
          <List.Item>
            If the board fills with neither side across, the game is a draw.
          </List.Item>
        </List>

        <Title order={4}>Good to know</Title>
        <List>
          <List.Item>
            The board is 24 by 24 holes with the four corners missing. Pinch or
            scroll to zoom in on a phone; hole names run A to X and 1 to 24.
          </List.Item>
          <List.Item>
            A link blocks the other side: they cannot thread a link through
            yours, so a chain across the board is a wall.
          </List.Item>
          <List.Item>
            Think in knight's moves: the shortest crossing needs thirteen pegs
            on an open board.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
