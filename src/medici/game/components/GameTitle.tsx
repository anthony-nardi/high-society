import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("medici");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          style={{ fontSize: "clamp(40px, 10vw, 80px)", letterSpacing: 4 }}
        >
          Medici
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Three days of auctions on the Florentine docks. Fill your ship, corner
          a market, and keep your florins. 2 to 6 players, by Reiner Knizia.
        </Text>
      </Center>
    </Stack>
  );
}
