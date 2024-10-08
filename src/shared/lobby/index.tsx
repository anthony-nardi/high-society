import { useCallback, useMemo, useState } from "react";
import PlayersList from "./components/PlayersList";
import { Button, Center, Flex, Grid, Loader } from "@mantine/core";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import readyUp from "../../high-society/client/readyUp";
import addBot from "../../high-society/client/addBot";
import createLobby, { GameName } from "../../high-society/client/createLobby";
import { useGameStateContext } from "../context/GameStateProvider";
import { useUserContext } from "../context/useUserContext";
import { useLobbyContext } from "../context/useLobbyContext";

export default function Lobby({ gameName }: { gameName: GameName }) {
  const { user } = useUserContext();
  const { lobbyId, isLoadingLobbyData, lobbyData, isJoiningLobby } =
    useLobbyContext();
  const { gameState } = useGameStateContext(gameName);
  const [isReadying, setIsReadying] = useState<null | boolean>(null);
  const [isCreatingLobby, setIsCreatingLobby] = useState<null | boolean>(null);
  const [isAddingBot, setIsAddingBot] = useState<null | boolean>(null);

  const showBotButton = useMemo(() => {
    try {
      return (
        !!window.localStorage[`${gameName}:bots`] || gameName === "no-thanks"
      );
    } catch (e) {
      console.log(e);
    }
  }, [gameName]);

  const isCurrentUserReady = useMemo(() => {
    if (!user || !lobbyData) return false;

    if ("players" in lobbyData) {
      const currentUser = lobbyData.players.find(
        (player) => player.email === user.email
      );

      return (currentUser && currentUser.ready) || false;
    }
  }, [user, lobbyData]);

  const handleCreateLobby = useCallback(async () => {
    setIsCreatingLobby(true);

    const lobby = await createLobby(gameName);
    window.location.hash = `#${lobby.data.lobbyUID}`;

    setIsCreatingLobby(false);
  }, [gameName]);

  const handleAddBot = useCallback(async () => {
    if (!user || !user.email || !lobbyId) {
      throw new Error("There is no current user or lobby.");
    }

    setIsAddingBot(true);

    await addBot({
      lobbyUID: lobbyId,
    });

    setIsAddingBot(false);
  }, [user, lobbyId]);

  const handleReadyUp = useCallback(async () => {
    if (!user || !user.email || !lobbyId) {
      throw new Error("There is no current user or lobby.");
    }

    setIsReadying(true);

    await readyUp({
      email: user.email,
      lobbyUID: lobbyId,
    });

    setIsReadying(false);
  }, [user, lobbyId]);

  if (!user) {
    return null;
  }

  if (!lobbyId) {
    return (
      <Center>
        <Button loading={!!isCreatingLobby} onClick={handleCreateLobby}>
          Create lobby
        </Button>
      </Center>
    );
  }

  if (gameState) {
    return null;
  }

  if (isJoiningLobby || isLoadingLobbyData || !!isCreatingLobby) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (!lobbyData || !lobbyData.players.length) {
    return <Center>Lobby does not exist.</Center>;
  }

  return (
    <Grid>
      <Grid.Col span={{ base: 6, md: 6, lg: 6 }} offset={3}>
        <Center>
          <Flex direction={"column"}>
            <Flex
              justify={"space-between"}
              align={"end"}
              styles={{ root: { marginBottom: "16px" } }}
            >
              <ConnectedPlayersCount
                gameName={gameName}
                players={(lobbyData && lobbyData.players) || []}
              />
              {!isCurrentUserReady && (
                <Button
                  onClick={handleReadyUp}
                  loading={!!isReadying}
                  disabled={!!isReadying}
                >
                  Click here to ready!
                </Button>
              )}
              {showBotButton && (
                <Button
                  onClick={handleAddBot}
                  loading={!!isAddingBot}
                  disabled={!!isAddingBot}
                >
                  Add bot
                </Button>
              )}
            </Flex>
            <PlayersList players={lobbyData.players} />
          </Flex>
        </Center>
      </Grid.Col>
    </Grid>
  );
}
