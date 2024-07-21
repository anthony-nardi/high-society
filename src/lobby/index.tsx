import { useCallback, useMemo, useState } from "react";
import { User } from "firebase/auth";
import PlayersList from "./components/PlayersList";
import { Button, Center, Flex, Grid, Loader } from "@mantine/core";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import useJoinLobby from "./hooks/useJoinLobby";
import useLobbyData from "./hooks/useLobbyData";
import usePopstate from "../hooks/usePopstate";
import readyUp from "../client/readyUp";
import createLobby from "../client/createLobby";
import getLobbyIdFromURL from "../utils/getLobbyIdFromURL";

export default function Lobby({ user }: { user: User | null }) {
  const [lobbyId, setLobbyId] = useState<number | null>(getLobbyIdFromURL());
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  const [isReadying, setIsReadying] = useState<null | boolean>(null);
  const [isCreatingLobby, setIsCreatingLobby] = useState<null | boolean>(null);

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  usePopstate(handleURLChange);

  const { isLoading: isJoiningLobby } = useJoinLobby({
    lobbyId,
    onAuthentication: setCurrentUser,
  });

  const { isLoading: isLoadingLobbyData, lobbyData } = useLobbyData(lobbyId);

  const isCurrentUserReady = useMemo(() => {
    if (!currentUser || !lobbyData) return false;

    if ("players" in lobbyData) {
      const user = lobbyData.players.find(
        (player) => player.email === currentUser.email
      );

      return (user && user.ready) || false;
    }
  }, [currentUser, lobbyData]);

  const handleCreateLobby = useCallback(async () => {
    setIsCreatingLobby(true);

    const lobby = await createLobby();
    window.location.hash = `#${lobby.data.lobbyUID}`;

    setIsCreatingLobby(false);
  }, []);

  const handleReadyUp = useCallback(async () => {
    if (!currentUser || !currentUser.email || !lobbyId) {
      throw new Error("There is no current user or lobby.");
    }

    setIsReadying(true);

    await readyUp({
      email: currentUser.email,
      lobbyUID: lobbyId,
    });

    setIsReadying(false);
  }, [currentUser, lobbyId]);

  if (!lobbyId) {
    return (
      <Center>
        <Button loading={!!isCreatingLobby} onClick={handleCreateLobby}>
          Create lobby
        </Button>
      </Center>
    );
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
            </Flex>
            <PlayersList players={lobbyData.players} />
          </Flex>
        </Center>
      </Grid.Col>
    </Grid>
  );
}
