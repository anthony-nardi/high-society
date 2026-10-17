import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import Marble from "./Marble";

export default function ZertzRules() {
  return (
    <RulesDrawer title="How to play ZÈRTZ">
      <Stack gap="md">
        <Text>
          A two-player abstract from the GIPF project by Kris Burm. The board
          is 37 rings, and it shrinks every turn. Capture marbles by jumping,
          and be the first to collect a winning set.
        </Text>

        <Title order={4}>The marbles</Title>
        <Group gap="md">
          <Group gap={4}>
            <Marble colour="WHITE" /> <Text size="sm">6 white</Text>
          </Group>
          <Group gap={4}>
            <Marble colour="GRAY" /> <Text size="sm">8 gray</Text>
          </Group>
          <Group gap={4}>
            <Marble colour="BLACK" /> <Text size="sm">10 black</Text>
          </Group>
        </Group>
        <Text size="sm">
          Nobody owns the marbles. They all sit in one shared pool until they
          are placed, and any marble on the board can be used by either player.
        </Text>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            <b>Place</b> a marble from the pool on any vacant ring, then
            <b> remove</b> a vacant ring from the edge: one with two adjacent
            sides free, so it can slide out. If no ring can go, you skip that.
          </List.Item>
          <List.Item>
            <b>Capture</b> if you can, and you must: jump a marble over an
            adjacent marble onto the vacant ring directly beyond, taking the
            marble you jumped. If the same marble can jump again, it must.
            Capturing replaces placing for that turn.
          </List.Item>
          <List.Item>
            If removing a ring cuts off a group of rings and every ring in it
            is occupied, you take all the marbles on it.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>Three marbles of each colour, or</List.Item>
          <List.Item>four white, or five gray, or six black.</List.Item>
          <List.Item>
            When the pool runs out you place marbles from your own captures. A
            player who can neither place nor capture loses.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
