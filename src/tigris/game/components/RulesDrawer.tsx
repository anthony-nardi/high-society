import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import TileIcon from "./TileIcon";
import { COLOURS, LEADER_NAME, POINT_NAME, TILE_NAME } from "../board";

export default function TigrisRules() {
  return (
    <RulesDrawer title="How to play Tigris & Euphrates">
      <Stack gap="md">
        <Text>
          Reiner Knizia's classic for 2 to 4 players, played by the 2015 Fantasy
          Flight rulebook on the standard board. Build kingdoms around temples,
          gather points in four spheres, and finish with the highest{" "}
          <b>lowest</b> sphere.
        </Text>

        <Title order={4}>The four spheres</Title>
        <Group gap="xs" wrap="wrap">
          {COLOURS.map((c) => (
            <Group key={c} gap={4} wrap="nowrap">
              <TileIcon colour={c} size={32} />
              <Text size="sm">
                {TILE_NAME[c]} · {LEADER_NAME[c]} · {POINT_NAME[c]}s
              </Text>
            </Group>
          ))}
        </Group>
        <List>
          <List.Item>
            153 tiles: 57 temples, 36 farms, 30 markets, 30 settlements. Farms
            go on the river; everything else on land.
          </List.Item>
          <List.Item>
            Each dynasty has four leaders, two catastrophes and a hand of six
            tiles. Ten temples with treasures start on the Shedu spaces.
          </List.Item>
        </List>

        <Title order={4}>Kingdoms</Title>
        <List>
          <List.Item>
            Tiles and leaders that touch are linked. A linked group with at
            least one leader is a kingdom (outlined in gold); without one it is
            a region.
          </List.Item>
          <List.Item>
            A leader must stand on land beside a faceup temple and may never
            join two kingdoms. If its last temple goes, it returns to you.
          </List.Item>
        </List>

        <Title order={4}>Your turn: two actions</Title>
        <List>
          <List.Item>
            <b>Place a tile.</b> If it joins a kingdom, the leader of that
            colour there gains a point; without one, the king does. A tile that
            unites two kingdoms pays nothing, and may start a war. No tile may
            unite three.
          </List.Item>
          <List.Item>
            <b>Position a leader:</b> place, move or withdraw one. Placing it in
            a kingdom with a rival of the same colour starts a revolt.
          </List.Item>
          <List.Item>
            <b>Play a catastrophe</b> on an empty space or a tile without a
            treasure or monument. The space is dead for the rest of the game.
          </List.Item>
          <List.Item>
            <b>Replace tiles:</b> send any of your tiles back and draw as many.
          </List.Item>
          <List.Item>
            At the end of your turn each of your leaders in a kingdom with a
            monument of its colour gains a point, and everyone refills to six.
          </List.Item>
        </List>

        <Title order={4}>Conflicts</Title>
        <List>
          <List.Item>
            <b>Revolt</b> (leader placed): each side counts the temples beside
            its leader, then the attacker and defender may commit temples from
            hand. Winner gains an amulet; the loser's leader leaves. Committed
            tiles are gone for good.
          </List.Item>
          <List.Item>
            <b>War</b> (kingdoms united): each side counts its supporters, the
            tiles of the leader's colour linked to it on its side of the uniting
            tile, then commits tiles of that colour from hand. The loser's
            leader and supporters are removed; the winner gains a point for
            each. A temple holding a treasure or standing beside another leader
            is spared.
          </List.Item>
          <List.Item>
            The defender wins ties. With several wars at once the uniting player
            picks the order, each fought on the board as it then stands.
          </List.Item>
        </List>

        <Title order={4}>Monuments and treasures</Title>
        <List>
          <List.Item>
            Completing a 2×2 square of one colour lets you flip it and build a
            monument of that colour and another, if one is left. Facedown tiles
            still link but support nobody; a monument can never be destroyed.
          </List.Item>
          <List.Item>
            When a kingdom with a trader holds more than one treasure, the
            trader's owner takes all but one, those on dashed-border spaces
            first. A treasure is a wild point.
          </List.Item>
        </List>

        <Title order={4}>The end</Title>
        <List>
          <List.Item>
            The game ends when two or fewer treasures remain on the board at the
            end of a turn, or when the bag runs out.
          </List.Item>
          <List.Item>
            Spend treasures on your weakest spheres; the highest lowest sphere
            wins, then the next lowest, and so on.
          </List.Item>
          <List.Item>
            Points are shown openly here rather than hidden behind screens. The
            advanced board, civilization buildings and the wonder are not
            included.
          </List.Item>
        </List>

        <Title order={4}>Bots</Title>
        <Text>
          A bot tries every legal action on a copy of the game, fights out any
          conflict it would start with sensible commitments, and keeps the
          result that best raises its lowest sphere while seating leaders with
          supporters and monuments around them, less what its strongest rival
          would gain.
        </Text>
      </Stack>
    </RulesDrawer>
  );
}
