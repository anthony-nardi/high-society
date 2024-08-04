import { Center, Stack } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("high-society");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="space-around" gap="md">
      <Center>
        <svg
          width="800"
          height="200"
          viewBox="0 0 800 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <path id="text-path" d="M10,100 H790" fill="none" stroke="none" />
          </defs>
          <text
            fontSize="100"
            fontFamily="Casanova"
            fill="#3B5752"
            stroke="#B4A166"
            strokeWidth=""
          >
            <textPath href="#text-path" startOffset="50%" textAnchor="middle">
              High Society
            </textPath>
            <animate
              attributeName="stroke-dasharray"
              from="0,1600"
              to="1600,0"
              begin="0s"
              dur="3s"
              fill="freeze"
            />
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="1600"
              begin="0s"
              dur="4s"
              fill="freeze"
            />
          </text>
        </svg>
      </Center>
    </Stack>
  );
}
