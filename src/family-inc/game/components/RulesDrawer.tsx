import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

export default function FamilyIncRules() {
  return (
    <RulesDrawer title="How to play Family Inc.">
      <Stack gap="md">
        <Text>
          A push-your-luck game for 2 to 7 players by Reiner Knizia. Draw chips
          from a face-down pile for as long as your nerve holds, stop to keep
          them and rob your rivals, and be first to 100 points.
        </Text>

        <Title order={4}>The chips</Title>
        <Text>
          135 chips with values 1 to 10: sixteen each of 1 to 5 and eleven each
          of 6 to 10, all in one face-down pile. Everything drawn is on the
          table or out of the game, so the pile can always be counted.
        </Text>

        <Title order={4}>Your turn</Title>
        <List>
          <List.Item>
            First, bank the chips in front of you: add their values to your
            score and remove them from the game.
          </List.Item>
          <List.Item>
            Then draw chips one at a time, until you draw a value you already
            drew this turn, or you decide to stop.
          </List.Item>
          <List.Item>
            <b>Stop:</b> steal every chip in front of your opponents whose value
            matches a chip you drew this turn. Your chips stay in front of you
            until your next turn, when you bank them, unless someone steals them
            first.
          </List.Item>
          <List.Item>
            <b>Bust:</b> every chip in front of you leaves the game. If you had
            drawn three chips or fewer this turn you receive a diamond. Three
            diamonds score 50 points at once and are removed.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>
            The first player to reach 100 points wins, whether by banking at the
            start of a turn or by completing three diamonds.
          </List.Item>
          <List.Item>
            When the pile runs out, every chip not in front of a player goes
            back into it.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
