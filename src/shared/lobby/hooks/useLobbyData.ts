import { useEffect, useState } from "react";
import { LobbyData } from "../types";
import { getDatabase, onValue, ref } from "firebase/database";
import { User } from "firebase/auth";

// Type definitions for the hook's state
type UseLobbyDataState = {
  isLoadingLobbyData: boolean | null;
  lobbyData: LobbyData | null;
};

type Snapshot = {
  // The lobby the data below belongs to, so a stale lobby's data is never
  // shown while a newly selected lobby is still loading.
  lobbyId: number | null;
  data: LobbyData | null;
};

const useLobbyData = ({
  lobbyId,
  user,
}: {
  lobbyId: number | null;
  user: User | null;
}): UseLobbyDataState => {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    lobbyId: null,
    data: null,
  });

  useEffect(() => {
    if (!user || !lobbyId || typeof lobbyId !== "number") {
      return;
    }

    const db = getDatabase();
    const lobbyRef = ref(db, `lobbies/${lobbyId}`);

    const unsubscribe = onValue(lobbyRef, (value) => {
      setSnapshot({ lobbyId, data: value.val() });
    });

    return () => {
      unsubscribe();
    };
  }, [lobbyId, user]);

  const isSubscribed = !!user && !!lobbyId && typeof lobbyId === "number";
  const hasDataForLobby = snapshot.lobbyId === lobbyId;

  return {
    isLoadingLobbyData: isSubscribed && !hasDataForLobby,
    lobbyData: hasDataForLobby ? snapshot.data : null,
  };
};

export default useLobbyData;
