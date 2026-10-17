import { Group, List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { COLOURS, label, OPENS, RAILROADS } from "../board";

export default function RideTheRailsRules() {
  return (
    <RulesDrawer title="How to play Ride the Rails">
      <Stack gap="md">
        <Text>
          John Bohrer's hour-long train game for three to five. Six railroads
          open one by one across America. Each round you take a share, lay
          track, and carry one passenger. Everyone whose railroads carried the
          passenger is paid. The most money after six rounds wins.
        </Text>

        <Title order={4}>A round, three steps</Title>
        <List type="ordered">
          <List.Item>
            <b>Take a share.</b> In reverse turn order, take one locomotive of
            any open railroad from the box. It is your share: you may build that
            railroad, and it pays you for every link of its track a passenger
            rides.
          </List.Item>
          <List.Item>
            <b>Build track.</b> In turn order, lay up to 8 locomotives (3
            players), 5 (4 players) or 4 (5 players), of any railroads you hold
            shares in. Entering the mountains that turn costs one placement.
          </List.Item>
          <List.Item>
            <b>Ride the rails.</b> In turn order, pick a passenger and carry it
            city to city along links. A link is one railroad's track between two
            cities. No hex may be visited twice. The passenger is then removed.
          </List.Item>
        </List>
        <Text size="sm">
          Then the poorest player goes first in the next round, and the next
          railroad opens.
        </Text>

        <Title order={4}>Paying out</Title>
        <List>
          <List.Item>
            The rider earns $1 per city visited, including the first and the
            last: that is the links travelled plus one.
          </List.Item>
          <List.Item>
            Each railroad used pays every holder $1 per link used per share.
            Three Red links pay a holder of two Red shares $6.
          </List.Item>
        </List>

        <Title order={4}>Laying track</Title>
        <List>
          <List.Item>
            A railroad's first locomotive goes in one of its cities; the rest
            must touch its own track.
          </List.Item>
          <List.Item>
            A hex holds at most two railroads, one locomotive each. Chicago
            holds any number.
          </List.Item>
          <List.Item>
            Chicago pays $2 whenever anyone builds there. The four $5 cities pay
            the first railroad in. The first west-to-east connection, over any
            railroads, pays $12 if made in a city and $8 elsewhere.
          </List.Item>
        </List>

        <Title order={4}>The railroads</Title>
        <Table withTableBorder fz="xs" verticalSpacing={4}>
          <Table.Tbody>
            {RAILROADS.map((r) => (
              <Table.Tr key={r}>
                <Table.Td style={{ width: 80 }}>
                  <Group gap={6} wrap="nowrap">
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: COLOURS[r],
                        flex: "0 0 auto",
                      }}
                    />
                    <b>{label(r)}</b>
                  </Group>
                </Table.Td>
                <Table.Td>
                  Round {OPENS[r]}.{" "}
                  {r === "RED" || r === "BLUE"
                    ? "Starts in one of the six east coast cities."
                    : r === "ORANGE"
                      ? "Starts on the east coast or in Chicago."
                      : r === "YELLOW"
                        ? "Starts in Chicago or one of the three westernmost cities with track."
                        : r === "PURPLE"
                          ? "Starts in one of the four west coast cities."
                          : "Starts in any city with room, or Chicago."}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">
          The map is redrawn for this app: forty cities on a hex grid, with the
          Appalachians, Rockies and Sierra as mountains.
        </Text>
      </Stack>
    </RulesDrawer>
  );
}
