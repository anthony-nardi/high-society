import { getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useRef } from "react";
import { notifications } from "@mantine/notifications";
import { useLobbyContext } from "../../context/LobbyProvider";

export const useServerNotification = () => {
  const { lobbyId } = useLobbyContext();
  const listeningToLobby = useRef<number | null>(null);
  const previousNotificationTimestamp = useRef<number>(0);

  useEffect(() => {
    if (!lobbyId || listeningToLobby.current === lobbyId) {
      return;
    }
    listeningToLobby.current = lobbyId;
    const db = getDatabase();

    const lobbyRef = ref(db, "games/" + lobbyId + "/public/notification");
    onValue(lobbyRef, (snapshot) => {
      const notification = snapshot.val();

      const currentNotificationTimestamp =
        (notification && notification.timestamp) || 0;
      if (
        previousNotificationTimestamp.current !== currentNotificationTimestamp
      ) {
        previousNotificationTimestamp.current = notification.timestamp;
        notifications.show({
          title: notification?.title as string,
          message: (notification?.message || "") as string,
          autoClose: 6000,
          withBorder: true,
          style: { backgroundColor: "#42384B" },
          color: "#fff",
        });
      }
    });
  }, [lobbyId]);
};
