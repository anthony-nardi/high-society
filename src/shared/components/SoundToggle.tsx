import { useEffect, useState } from "react";
import { ActionIcon } from "@mantine/core";
import { isMuted, onMuteChange, playSound, setMuted } from "../sound";

/** Speaker button pinned top-right, left of How to play. Remembers the choice. */
export default function SoundToggle() {
  const [muted, setMutedState] = useState(() => isMuted());

  useEffect(() => onMuteChange(setMutedState), []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    if (!next) playSound("chip");
  };

  return (
    <ActionIcon
      variant="subtle"
      size="md"
      onClick={toggle}
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      aria-pressed={muted}
      title={muted ? "Sounds are off" : "Sounds are on"}
      style={{ position: "fixed", top: 12, right: 112, zIndex: 1100 }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>
        {muted ? "🔇" : "🔊"}
      </span>
    </ActionIcon>
  );
}
