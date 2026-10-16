import { useEffect, useRef } from "react";
import { playSound, soundForEvent } from "../sound";

type Notification = { title: string; timestamp: number } | undefined | null;

/**
 * Plays a sound for each new server event. The event already on screen
 * when the page loads is skipped, so refreshing a game is silent.
 */
export default function useGameSounds(notification: Notification) {
  const lastTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!notification) return;
    if (lastTimestamp.current === null) {
      lastTimestamp.current = notification.timestamp;
      return;
    }
    if (notification.timestamp === lastTimestamp.current) return;
    lastTimestamp.current = notification.timestamp;

    const kind = soundForEvent(notification.title);
    if (kind) playSound(kind);
  }, [notification]);
}
