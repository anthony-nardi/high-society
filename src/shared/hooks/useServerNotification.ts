import { DataSnapshot, getDatabase, onValue, ref } from "firebase/database";
import { useEffect, useRef, useCallback } from "react";
import { notifications } from "@mantine/notifications";
import { useLobbyContext } from "../context/useLobbyContext";

interface Notification {
  title: string;
  message: string;
  timestamp: number;
}

/** Colour by what happened, so the feed can be scanned at a glance. */
export function notificationColor(notification: Notification) {
  const text = `${notification.title} ${notification.message || ""}`;
  if (/game over/i.test(text)) return "yellow";
  if (/receives/i.test(text)) return "red";
  if (/won/i.test(text)) return "green";
  if (/passed/i.test(text)) return "gray";
  return "blue";
}

const showNotification = (notification: Notification) => {
  notifications.show({
    title: notification.title,
    message: notification.message,
    autoClose: 6000,
    withBorder: true,
    color: notificationColor(notification),
  });
};

export const useServerNotification = () => {
  const { lobbyId } = useLobbyContext();
  const listeningToLobby = useRef<number | null>(null);
  const previousNotificationTimestamp = useRef<number>(0);

  const handleNotification = useCallback((snapshot: DataSnapshot) => {
    const notification: Notification = snapshot.val();
    const currentNotificationTimestamp = notification?.timestamp || 0;

    if (
      previousNotificationTimestamp.current !== currentNotificationTimestamp
    ) {
      previousNotificationTimestamp.current = notification.timestamp;
      showNotification(notification);
    }
  }, []);

  useEffect(() => {
    if (!lobbyId || listeningToLobby.current === lobbyId) {
      return;
    }
    listeningToLobby.current = lobbyId;
    const db = getDatabase();
    const lobbyRef = ref(db, `games/${lobbyId}/public/notification`);

    const unsubscribe = onValue(lobbyRef, handleNotification);

    return () => {
      listeningToLobby.current = null;
      unsubscribe();
    };
  }, [lobbyId, handleNotification]);
};
