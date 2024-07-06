import { User } from "firebase/auth";
import { LobbyData } from "../types";
import { useCallback, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function PlayersList({
  players,
  user,
  lobbyUID,
}: {
  players: LobbyData["players"];
  user: User;
  lobbyUID: string;
}) {
  const handleReadyUp = useCallback(() => {
    const functions = getFunctions();

    const readyUp = httpsCallable<any, any>(functions, "readyup");

    readyUp({
      email: user.email,
      lobbyUID,
    });
  }, []);

  const renderCurrentPlayerStatus = useMemo(() => {
    const currentPlayer = players.find((player) => player.email === user.email);
    if (currentPlayer && currentPlayer.ready) {
      return <b>Waiting for others...</b>;
    }

    return <button onClick={handleReadyUp}>Ready?</button>;
  }, [players, user, handleReadyUp]);

  const renderedUsers = useMemo(() => {
    return players.map((player) => {
      return (
        <div>
          <span>{player.email}</span>
          {player.email === user.email ? (
            renderCurrentPlayerStatus
          ) : player.ready ? (
            <b>Waiting for others...</b>
          ) : (
            <span>Not ready</span>
          )}
        </div>
      );
    });
  }, [players, user, renderCurrentPlayerStatus]);

  return <div>{renderedUsers}</div>;
}
