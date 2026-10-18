import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import TileIcon from "./TileIcon";
import MiniBoard from "./MiniBoard";
import { COLOURS, LEADER_NAME, POINT_NAME, TILE_NAME } from "../board";

export default function TigrisRules() {
  return (
    <RulesDrawer title="How to play Tigris & Euphrates">
      <Stack gap="md">
        <Text>
          Reiner Knizia's classic for 2 to 4 players, played by the 2015 Fantasy
          Flight rulebook on the standard board. Seat your leaders beside
          temples, grow kingdoms, fight for them, and gather points in four
          spheres. At the end only your <b>lowest</b> sphere counts: the player
          whose weakest sphere is strongest wins.
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
            go on the river, everything else on land. Each player has a dynasty
            of four leaders (one per colour), two catastrophes and six tiles in
            hand.
          </List.Item>
          <List.Item>
            Ten temples with treasures start on the Shedu spaces (✦). Four of
            them have a dashed border: their treasures are taken first.
          </List.Item>
        </List>

        <Title order={4}>Kingdoms and regions</Title>
        <MiniBoard
          caption="Left: a kingdom, outlined in gold, because a leader stands in it. Right: a region, tiles without a leader. A tile at the marked space would join them into one kingdom."
          spec={{
            cols: 6,
            rows: 3,
            tiles: {
              "1_0": { colour: "RED" },
              "1_2": { colour: "BLACK" },
              "1_4": { colour: "RED", treasure: true },
              "0_4": { colour: "GREEN" },
            },
            leaders: { "1_1": { colour: "BLACK", dynasty: "BULL" } },
            marks: { "1_3": { text: "∪", fill: "#4a4a4a" } },
          }}
        />
        <List>
          <List.Item>
            Tiles and leaders that share an edge are linked. A leader must stand
            on land beside a faceup temple, and may never be placed so as to
            join two kingdoms. If its last temple goes, it returns to its owner.
          </List.Item>
        </List>

        <Title order={4}>Your turn: two actions</Title>
        <List>
          <List.Item>
            <b>Place a tile.</b> If it joins a kingdom, the leader of that
            colour there gains a point; if there is none, the king does. A tile
            that unites two kingdoms pays nothing and may start a war. No tile
            may unite three kingdoms.
          </List.Item>
          <List.Item>
            <b>Position a leader:</b> place, move or withdraw one. Seating it in
            a kingdom beside a rival of the same colour starts a revolt.
          </List.Item>
          <List.Item>
            <b>Play a catastrophe</b> on an empty space or on a tile without a
            treasure or monument (never on a leader). The space is dead for the
            rest of the game.
          </List.Item>
          <List.Item>
            <b>Replace tiles:</b> send any of your tiles back and draw as many.
          </List.Item>
          <List.Item>
            At the end of your turn each of your leaders in a kingdom with a
            monument of its colour gains a point, and everyone refills to six.
          </List.Item>
        </List>
        <MiniBoard
          caption="Bull's king in a kingdom with a temple and a settlement. A market at the right space pays Bull a good (no trader, so the king collects); a settlement would pay a brick. The temple's space on top would pay an amulet."
          spec={{
            cols: 5,
            rows: 3,
            tiles: { "1_0": { colour: "RED" }, "1_2": { colour: "BLACK" } },
            leaders: { "1_1": { colour: "BLACK", dynasty: "BULL" } },
            marks: {
              "1_3": { text: "+1" },
              "0_1": { text: "+1" },
              "2_1": { text: "+1" },
            },
          }}
        />

        <Title order={4}>Revolts</Title>
        <MiniBoard
          caption="Pot seats a priest in Bull's kingdom: a revolt. Pot has three temples beside the priest, Bull two. Pot commits two more from hand, Bull three: five against five, and the defender wins ties. Pot's priest goes home; Bull gains an amulet; the five committed temples leave the game."
          spec={{
            cols: 5,
            rows: 3,
            tiles: {
              "0_1": { colour: "RED" },
              "1_0": { colour: "RED" },
              "2_1": { colour: "RED" },
              "1_2": { colour: "GREEN" },
              "0_3": { colour: "RED" },
              "2_3": { colour: "RED" },
            },
            leaders: {
              "1_1": { colour: "RED", dynasty: "POT" },
              "1_3": { colour: "RED", dynasty: "BULL" },
            },
          }}
        />
        <List>
          <List.Item>
            The player seating the leader attacks. Each side counts the temples
            beside its leader (a temple can count for both), then the attacker
            and the defender each commit any number of temples from hand, once,
            attacker first.
          </List.Item>
          <List.Item>
            Higher total wins; ties go to the defender. The loser withdraws the
            leader; the winner gains one amulet. All committed temples are
            removed from the game.
          </List.Item>
        </List>

        <Title order={4}>Wars</Title>
        <MiniBoard
          caption="Lion places the marked tile, uniting two kingdoms that both hold a trader: war. Each trader's supporters are the markets linked to it on its own side of the uniting tile: Lion has one, Pot two. Lion commits four markets from hand, Pot one: five to three. Pot's trader and both markets are removed; Lion gains three goods, one for the leader and one per market."
          spec={{
            cols: 8,
            rows: 2,
            tiles: {
              "1_0": { colour: "RED" },
              "1_2": { colour: "GREEN" },
              "1_3": { colour: "BLACK" },
              "1_4": { colour: "GREEN" },
              "1_5": { colour: "GREEN" },
              "0_6": { colour: "RED" },
            },
            leaders: {
              "1_1": { colour: "GREEN", dynasty: "LION" },
              "1_6": { colour: "GREEN", dynasty: "POT" },
            },
            uniting: "1_3",
          }}
        />
        <List>
          <List.Item>
            If the player who united the kingdoms has a leader in the war, they
            attack; otherwise the next player round the table who does. With
            several colours in conflict the uniting player picks the order, and
            each war is fought on the board as it then stands: an earlier war
            may have split the kingdom again.
          </List.Item>
          <List.Item>
            Each side counts its supporters: the tiles of the leader's colour
            linked to it on its side of the uniting tile (the uniting tile
            itself counts for nobody). Then the attacker, then the defender,
            commits tiles of that colour from hand.
          </List.Item>
          <List.Item>
            Higher total wins, ties to the defender. The loser's leader and
            supporters are removed and the winner gains a point for each; the
            committed tiles leave the game. In a war of priests, a temple
            holding a treasure or standing beside another leader is spared and
            pays nothing.
          </List.Item>
        </List>

        <Title order={4}>Monuments</Title>
        <MiniBoard
          caption="Placing the fourth settlement completes a 2×2 square: Bull may flip the four tiles and build a monument of black and one other colour. Facedown tiles still link kingdoms but no longer support anyone; the monument can never be destroyed."
          spec={{
            cols: 5,
            rows: 3,
            tiles: {
              "0_1": { colour: "BLACK" },
              "0_2": { colour: "BLACK" },
              "1_1": { colour: "BLACK" },
              "1_3": { colour: "RED" },
            },
            leaders: { "0_3": { colour: "BLACK", dynasty: "BULL" } },
            marks: { "1_2": { text: "2×2", fill: "#4a4a4a" } },
          }}
        />
        <List>
          <List.Item>
            Six monuments exist, each of two colours; a monument can be built
            only right after completing the square, and only if one of its
            colours matches. At the end of their turn, the active player gains a
            point for each of their leaders that shares a kingdom with a
            monument of that leader's colour. A king is paid only by black.
          </List.Item>
          <List.Item>
            Leaders whose only temple is flipped are withdrawn. A treasure on a
            flipped temple stays there.
          </List.Item>
        </List>

        <Title order={4}>Treasures</Title>
        <MiniBoard
          caption="Lion's trader links two temples with treasures. All but one are taken: the dashed-border one first. A treasure is a wild point, spent at the end on any sphere."
          spec={{
            cols: 5,
            rows: 2,
            border: ["0_1"],
            tiles: {
              "0_1": { colour: "RED", treasure: true },
              "0_3": { colour: "RED", treasure: true },
            },
            leaders: { "0_2": { colour: "GREEN", dynasty: "LION" } },
            marks: { "0_1": { text: "1st", fill: "#b8860b" } },
          }}
        />
        <List>
          <List.Item>
            Whenever a kingdom holds more than one treasure at the end of an
            action and has a trader in it, the trader's owner takes all but one,
            choosing which stay. Without a trader they wait.
          </List.Item>
        </List>

        <Title order={4}>The end</Title>
        <List>
          <List.Item>
            The game ends when two or fewer treasures remain on the board at the
            end of a turn, or when the bag runs out while someone draws.
          </List.Item>
          <List.Item>
            Each player spends treasures on their weakest spheres, then compares
            lowest spheres: the highest wins. Ties look at the second lowest,
            and so on.
          </List.Item>
        </List>

        <Title order={4}>Reading the table</Title>
        <List>
          <List.Item>
            Gold outlines are kingdoms; a gold diamond marks the uniting tile
            while its wars are fought, and the two sides are tinted red
            (attacker) and blue (defender) with the tiles that count glowing.
          </List.Item>
          <List.Item>
            Pick up a tile, a leader or a catastrophe and the legal spaces light
            up: <b>+1</b> shows who a tile would pay (green for you), <b>∪</b> a
            union with no point, <b>⚔</b> a war or revolt, <b>★</b> treasures a
            trader would reach.
          </List.Item>
          <List.Item>
            Points are shown openly rather than hidden behind screens. The
            advanced board, civilization buildings and the wonder are not
            included.
          </List.Item>
        </List>

        <Title order={4}>Bots</Title>
        <Text>
          A bot tries every legal action on a copy of the game and fights out
          any conflict it would start with sensible commitments. It values its
          lowest sphere above all, then leaders in place with supporters, room
          to grow, monuments and treasures within reach, less the threats round
          them and what its strongest rival stands to gain; its best few first
          actions are followed by their best second action before it decides.
        </Text>
      </Stack>
    </RulesDrawer>
  );
}
