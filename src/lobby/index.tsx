import { useCallback, useEffect, useMemo, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { User } from "firebase/auth";
import { CreateLobbyResponse, LobbyData } from "./types";
import PlayersList from "./components/PlayersList";
import { Button, Center, Flex, Grid } from "@mantine/core";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import useJoinLobby from "./hooks/useJoinLobby";

export default function Lobby({ user }: { user: User | null }) {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [lobbyData, setLobbyData] = useState<null | LobbyData>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  const isCurrentUserReady = useMemo(() => {
    if (!currentUser || !lobbyData) return false;

    if ("players" in lobbyData) {
      const user = lobbyData.players.find(
        (player) => player.email === currentUser.email
      );

      return (user && user.ready) || false;
    }
  }, []);

  useJoinLobby({
    lobbyId,
    onAuthentication: setCurrentUser,
  });

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number") return;

    const db = getDatabase();

    const lobbyRef = ref(db, "lobbies/" + lobbyId);

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setLobbyData(data);
    });
  }, [lobbyId]);

  useEffect(() => {
    window.addEventListener("popstate", handleURLChange);

    return () => {
      window.removeEventListener("popstate", handleURLChange);
    };
  }, [handleURLChange]);

  const handleCreateLobby = useCallback(() => {
    const functions = getFunctions();

    const createLobby = httpsCallable<undefined, CreateLobbyResponse>(
      functions,
      "createlobby"
    );
    createLobby().then((result) => {
      const data = result.data;

      if (data.lobbyUID) {
        window.location.hash = `#${data.lobbyUID}`;
      }
    });
  }, []);

  const handleReadyUp = useCallback(() => {
    if (!currentUser) {
      throw new Error("There is no current user.");
    }

    const functions = getFunctions();

    const readyUp = httpsCallable<any, any>(functions, "readyup");

    readyUp({
      email: currentUser.email,
      lobbyUID: lobbyId,
    });
  }, [currentUser, lobbyId]);

  if (!lobbyId) {
    return (
      <Center>
        <Button onClick={handleCreateLobby}>Create lobby</Button>
      </Center>
    );
  }

  if (!lobbyData || !lobbyData.players.length || !currentUser) {
    return <div>No data found for lobby</div>;
  }

  return (
    <>
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
                  <Button onClick={handleReadyUp}>Click here to ready!</Button>
                )}
              </Flex>
              <PlayersList players={lobbyData.players} />
            </Flex>
          </Center>
        </Grid.Col>
      </Grid>
    </>
  );
}
