import { useEffect, useRef } from "react";

const TURN_TITLE = "▶ Your turn · High Society";

/** Two short rising notes; silently skipped if audio is unavailable. */
function chime() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const gain = context.createGain();
    gain.gain.value = 0.06;
    gain.connect(context.destination);

    [523.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      const start = context.currentTime + index * 0.14;
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });

    window.setTimeout(() => void context.close(), 600);
  } catch (e) {
    console.log(e);
  }
}

/**
 * Flags the tab title and plays a chime when it becomes the player's turn,
 * so a player who looked away still notices.
 */
export default function useTurnAlert(isActive: boolean) {
  const originalTitle = useRef(document.title);
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive && !wasActive.current) {
      document.title = TURN_TITLE;
      chime();
    } else if (!isActive && wasActive.current) {
      document.title = originalTitle.current;
    }
    wasActive.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const title = originalTitle.current;
    return () => {
      document.title = title;
    };
  }, []);
}
