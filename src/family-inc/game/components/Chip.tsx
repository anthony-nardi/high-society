import { Badge } from "@mantine/core";
import type { CSSProperties } from "react";
import { ChipValue } from "../types";

/** One poker chip, from the original game's artwork. */
export default function Chip({
  value,
  size = 40,
  dimmed = false,
  highlighted = false,
  style,
}: {
  value: ChipValue;
  size?: number;
  dimmed?: boolean;
  highlighted?: boolean;
  style?: CSSProperties;
}) {
  return (
    <img
      src={`/family-inc/chip-${value}.png`}
      alt={`${value} chip`}
      width={size}
      height={size}
      style={{
        display: "block",
        opacity: dimmed ? 0.4 : 1,
        borderRadius: "50%",
        boxShadow: highlighted
          ? "0 0 0 3px var(--mantine-color-yellow-5), 0 0 12px rgba(255, 216, 107, 0.7)"
          : "0 2px 4px rgba(0, 0, 0, 0.5)",
        ...style,
      }}
    />
  );
}

/** A value's chips as one chip with a count, to keep rows short. */
export function ChipStack({
  value,
  n,
  size = 40,
  atRisk = false,
}: {
  value: ChipValue;
  n: number;
  size?: number;
  atRisk?: boolean;
}) {
  if (n <= 0) return null;
  return (
    <div
      style={{ position: "relative", width: size, height: size }}
      title={
        atRisk
          ? `${n} × ${value}: the active player holds a ${value} too and would take these by stopping`
          : `${n} × ${value}`
      }
      aria-label={`${n} chip${n === 1 ? "" : "s"} of value ${value}${
        atRisk ? ", at risk" : ""
      }`}
      role="img"
    >
      <Chip value={value} size={size} highlighted={atRisk} />
      {n > 1 && (
        <Badge
          size="xs"
          circle
          color="dark"
          style={{
            position: "absolute",
            top: -6,
            right: -8,
            border: "1px solid var(--mantine-color-default-border)",
          }}
        >
          {n}
        </Badge>
      )}
    </div>
  );
}

export function Diamonds({ count, size = 28 }: { count: number; size?: number }) {
  if (count <= 0) return null;
  return (
    <span
      style={{ display: "inline-flex", gap: 2 }}
      aria-label={`${count} diamond${count === 1 ? "" : "s"}`}
      role="img"
    >
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          src="/family-inc/diamond.png"
          alt=""
          width={size}
          height={size}
          style={{ display: "block" }}
        />
      ))}
    </span>
  );
}
