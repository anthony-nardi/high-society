import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function YinshRules() {
  return (
    <RulesDrawer title="How to play YINSH">
      <Stack gap="md">
        <Text>
          A two-player abstract from the GIPF project by Kris Burm. Rings move
          and leave markers behind; markers flip whenever a ring jumps them.
          Line up five of your colour and you score a ring. Three rings win.
        </Text>

        <Title order={4}>Setup</Title>
        <List>
          <List.Item>Each player has five rings; white starts.</List.Item>
          <List.Item>
            Players alternate placing one ring at a time on any vacant point
            until all ten are down.
          </List.Item>
          <List.Item>
            51 markers, white on one side and black on the other, sit in a
            shared pool.
          </List.Item>
        </List>

        <Title order={4}>A move</Title>
        <List>
          <List.Item>
            Pick one of your rings. A marker of your colour goes where it stood,
            and the ring moves in a straight line.
          </List.Item>
          <List.Item>
            It may cross any number of vacant points. It may jump over an
            unbroken run of markers of any colour, but must then stop on the
            first vacant point after them. It can never pass a ring.
          </List.Item>
          <List.Item>
            Every marker the ring jumped is flipped to the other colour.
          </List.Item>
        </List>

        <Title order={4}>Rows</Title>
        <List>
          <List.Item>
            Five markers of one colour in an unbroken straight line make a row.
            Rings do not count.
          </List.Item>
          <List.Item>
            The owner of the colour removes those five markers and then one of
            their own rings. More than five in a line: choose which five.
          </List.Item>
          <List.Item>
            You can flip a row into existence for your opponent. The mover
            resolves their own rows first, then the opponent resolves theirs,
            before the next move.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>The first player to remove three rings wins.</List.Item>
          <List.Item>
            If the markers run out first, the player who removed more rings
            wins; equal is a draw.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
