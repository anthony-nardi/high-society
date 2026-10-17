import { CondottiereGameState } from "../types";
import { BORDERS, colourOf, controllerOf, REGIONS } from "../board";
import BoardSurface from "../../../shared/components/BoardSurface";

export type Highlight = "selectable" | "selected" | "battlefield" | "last";

const BOX = { minX: 0, minY: 0, width: 100, height: 100 };

/** Italy as a graph of region plaques; markers in player colours, the Pope and the battlefield marked. */
export default function Map({
  gameState,
  highlights,
  onClick,
}: {
  gameState: CondottiereGameState;
  highlights: { [region: number]: Highlight };
  onClick?: (region: number) => void;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      style={{
        display: "block",
        maxWidth: 640,
        margin: "0 auto",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      role="group"
      aria-label="The map of Italy"
    >
      <BoardSurface id="condottiere" box={BOX} radius={6} />
      {BORDERS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={REGIONS[a].x}
          y1={REGIONS[a].y}
          x2={REGIONS[b].x}
          y2={REGIONS[b].y}
          stroke="rgba(28,16,6,0.55)"
          strokeWidth="0.7"
        />
      ))}
      {REGIONS.map((info, index) => {
        const h = highlights[index];
        const owner = controllerOf(gameState, index);
        const clickable = !!onClick && (h === "selectable" || h === "selected");
        const isBattle = gameState.battlefield === index;
        const isPope = gameState.pope === index;
        const ring =
          h === "selected"
            ? "#ffd86b"
            : h === "selectable"
              ? "rgba(255, 216, 107, 0.75)"
              : isBattle
                ? "#ff6b6b"
                : "rgba(0,0,0,0.55)";
        return (
          <g
            key={index}
            className="point"
            onClick={clickable ? () => onClick(index) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
            role={clickable ? "button" : undefined}
            aria-label={`${info.name}${owner ? `, held by ${owner}` : ""}${isPope ? ", the Pope" : ""}${isBattle ? ", the battlefield" : ""}${h ? ` (${h})` : ""}`}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " "))
                onClick(index);
            }}
          >
            <circle cx={info.x} cy={info.y} r="6.5" fill="transparent" />
            <circle
              cx={info.x + 0.4}
              cy={info.y + 0.5}
              r="4.6"
              fill="#000"
              opacity="0.4"
            />
            <circle
              className={
                h === "selectable" || h === "selected"
                  ? "target-disc"
                  : undefined
              }
              cx={info.x}
              cy={info.y}
              r="4.6"
              fill={owner ? colourOf(gameState, owner) : "#f1e4c6"}
              stroke={ring}
              strokeWidth={h || isBattle ? 0.9 : 0.4}
              strokeDasharray={h === "selectable" ? "1 0.6" : undefined}
            />
            {isBattle && (
              <circle
                className="row-glow"
                cx={info.x}
                cy={info.y}
                r="6"
                fill="rgba(255,107,107,0.25)"
                stroke="#ff6b6b"
                strokeWidth="0.5"
                aria-hidden="true"
              />
            )}
            {isPope && (
              <text
                x={info.x}
                y={info.y + 1.6}
                textAnchor="middle"
                fontSize="4.5"
                fill={owner ? "#fff" : "#4a2c6a"}
                fontWeight="800"
                style={{ pointerEvents: "none" }}
              >
                ✝
              </text>
            )}
            <text
              x={info.x}
              y={info.y + 8.6}
              textAnchor="middle"
              fontSize="2.6"
              fontWeight="700"
              fill="#f6edd0"
              style={{ pointerEvents: "none" }}
            >
              {info.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
