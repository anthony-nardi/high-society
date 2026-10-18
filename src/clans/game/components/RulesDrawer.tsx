import { List, Stack, Table, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { EPOCHS, label, TERRAIN_FILL } from "../board";

export default function ClansRules() {
  return (
    <RulesDrawer title="How to play Clans">
      <Stack gap="md">
        <Text>
          Leo Colovini's game of secret clans, for two to four. Sixty huts of
          five colours stand on the board, one to a territory. Each turn you
          move all the huts of one territory into a neighbouring one. When a
          group has no occupied neighbours left it becomes a village, and every
          clan living in it scores its size. You lead one clan in secret; the
          rest belong to nobody.
        </Text>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            Move <b>all</b> the huts of one territory into a neighbouring
            territory that already holds huts. Rivers can be crossed; lakes
            cannot.
          </List.Item>
          <List.Item>
            A group of <b>seven or more</b> huts can no longer be moved. Others
            may still join it.
          </List.Item>
          <List.Item>
            You may move any huts, whatever their colour. Nobody knows which
            clan is yours until the end.
          </List.Item>
        </List>

        <Title order={4}>Villages</Title>
        <List>
          <List.Item>
            When a group's neighbours are all empty, it founds a <b>village</b>.
            Its value is the number of huts in it; every colour present scores
            the full value on the track. You take the village chip, worth a
            point at the end, and the huts leave the board.
          </List.Item>
          <List.Item>
            <b>Strife:</b> if all five colours are present, every colour with
            only one hut is driven out first and scores nothing.
          </List.Item>
          <List.Item>
            A village in the epoch's <b>favoured</b> terrain scores its bonus
            too. One in the <b>forbidden</b> terrain is razed: nothing scores,
            but the chip is still taken.
          </List.Item>
        </List>

        <Title order={4}>The five epochs</Title>
        <Table withTableBorder fz="xs" verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Epoch</Table.Th>
              <Table.Th>Villages</Table.Th>
              <Table.Th>Favoured</Table.Th>
              <Table.Th>Forbidden</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {EPOCHS.map((e, i) => (
              <Table.Tr key={i}>
                <Table.Td>{i + 1}</Table.Td>
                <Table.Td>{e.villages}</Table.Td>
                <Table.Td>
                  {e.favoured ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: TERRAIN_FILL[e.favoured],
                          marginRight: 4,
                        }}
                      />
                      {label(e.favoured)} +{e.bonus}
                    </>
                  ) : (
                    "none"
                  )}
                </Table.Td>
                <Table.Td>
                  {e.forbidden ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: TERRAIN_FILL[e.forbidden],
                          marginRight: 4,
                        }}
                      />
                      {label(e.forbidden)}
                    </>
                  ) : (
                    "none"
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">
          The board and the epoch chart are this app's own layout, since the
          printed ones are not published: sixty territories in twelve regions of
          five, fifteen of each terrain, six lakes.
        </Text>

        <Title order={4}>The end</Title>
        <List>
          <List.Item>
            The game ends when the twelfth village is founded, or when no group
            can move.
          </List.Item>
          <List.Item>
            Clans are revealed. Your score is your clan's track total plus one
            point per village chip. Most points wins; ties share the win.
          </List.Item>
          <List.Item>
            Points scored by clans nobody leads are wasted, so steer villages
            towards colours you hope are yours alone, and starve the rest.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
