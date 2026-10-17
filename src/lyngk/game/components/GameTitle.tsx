import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("lyngk");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          style={{ fontSize: "clamp(40px, 10vw, 80px)", letterSpacing: 6 }}
        >
          LYNGK
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Claim two colours, stack five, link through your own. 2 players, the
          last game of the GIPF project by Kris Burm.
        </Text>
      </Center>
    </Stack>
  );
}
