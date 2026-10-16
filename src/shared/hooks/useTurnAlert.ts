import { useEffect, useRef } from "react";
import { playSound } from "../sound";

/**
 * Flags the tab title and plays a chime when it becomes the player's turn,
 * so a player who looked away still notices.
 */
export default function useTurnAlert(isActive: boolean, gameTitle: string) {
  const originalTitle = useRef(document.title);
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive && !wasActive.current) {
      document.title = `▶ Your turn · ${gameTitle}`;
      playSound("turn");
    } else if (!isActive && wasActive.current) {
      document.title = originalTitle.current;
    }
    wasActive.current = isActive;
  }, [isActive, gameTitle]);

  useEffect(() => {
    const title = originalTitle.current;
    return () => {
      document.title = title;
    };
  }, []);
}
