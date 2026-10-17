import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { MASTER_LABEL, MASTER_MARK, MASTERS } from "../board";

export default function ShangriLaRules() {
  return (
    <RulesDrawer title="How to play The Bridges of Shangri-La">
      <Stack gap="md">
        <Text>
          Leo Colovini's game of masters, students and crumbling bridges, for
          three or four. Spread your clan's masters through the villages; every
          journey of students breaks the bridge behind it, and when the last
          bridge is gone, the most masters on the board wins.
        </Text>

        <Title order={4}>The map</Title>
        <List>
          <List.Item>
            Thirteen villages joined by bridges, laid out for this app. With
            three players the eastern village sits out.
          </List.Item>
          <List.Item>
            Each village has one space for each of seven disciplines. A tile on
            a space is a master; a second tile on top is that master's student.
          </List.Item>
        </List>
        <Group gap="xs">
          {MASTERS.map((m) => (
            <Text key={m} size="xs" c="dimmed">
              <b>{MASTER_MARK[m]}</b> {MASTER_LABEL[m]}
            </Text>
          ))}
        </Group>

        <Title order={4}>Setup</Title>
        <List>
          <List.Item>
            In turn, place one master of each discipline, seven in all. During
            setup a village holds at most two of your tiles and three in all
            (one and two with three players).
          </List.Item>
        </List>

        <Title order={4}>Your turn: one of three</Title>
        <List>
          <List.Item>
            <b>Place a master</b> from your supply on an empty matching space in
            a village where you already have a master.
          </List.Item>
          <List.Item>
            <b>Recruit students</b>: put up to two tiles from your supply on
            your own masters, one student per master, anywhere.
          </List.Item>
          <List.Item>
            <b>Journey</b>: choose a village with a student of yours and a
            bridge from it. Every student in that village crosses, yours and
            your rivals', the masters stay, and the bridge breaks for good.
          </List.Item>
        </List>

        <Title order={4}>Arriving</Title>
        <List>
          <List.Item>
            A village's strength is all its tiles, masters and students, of
            every colour. Ties go to more masters, then to the destination.
          </List.Item>
          <List.Item>
            From a stronger village: a student on an empty space becomes a
            master; on a rival's space, the rival's tiles go home and the
            student becomes master; on your own master, it becomes its student;
            if that master already has one, the traveller goes home.
          </List.Item>
          <List.Item>
            From a weaker village: only empty spaces can be taken; everyone else
            goes home.
          </List.Item>
        </List>

        <Title order={4}>Peace and the end</Title>
        <List>
          <List.Item>
            A village with no bridges left receives a Stone of the Wise Men.
            Nothing changes there again.
          </List.Item>
          <List.Item>
            Whoever has nothing to do is skipped. The game ends when the last
            bridge breaks, or nobody can act.
          </List.Item>
          <List.Item>
            Most masters on the board wins, students not counted. Ties go to the
            most villages occupied.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
