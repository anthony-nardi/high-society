import { useContext } from "react";
import { LobbyContext } from "./LobbyContext";

export const useLobbyContext = () => {
  const context = useContext(LobbyContext);

  if (!context) {
    throw new Error("useLobbyContext must be used within a LobbyContext");
  }

  return context;
};
