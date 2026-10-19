import { Text } from "@mantine/core";
import displayName from "../../../shared/utils/displayName";
import {
  COMMODITIES,
  COMMODITY_INFO,
  commodityName,
  countOf,
  seatColour,
  TOP_LEVEL,
  TRACK_BONUS,
} from "../board";
import type { MediciGameState } from "../types";
import classes from "../medici.module.css";

const COL = 120;
const STEP = 25;
const BASE_Y = 236;

/**
 * The board: five pyramids, one a commodity. Each player's counter shows
 * where they will stand tonight, cargo counted; a faint ring marks where
 * they stood this morning when the two differ.
 */
export default function Tracks({
  gameState,
  me,
}: {
  gameState: MediciGameState;
  me?: string | null;
}) {
  const players = gameState.players;
  const width = COL * COMMODITIES.length;
  return (
    <div className={classes.tracks} data-testid="tracks">
      <svg
        viewBox={`0 0 ${width} 262`}
        width="100%"
        style={{ display: "block", maxWidth: 680 }}
        role="img"
        aria-label="Commodity tracks"
      >
        {COMMODITIES.map((commodity, ci) => {
          const info = COMMODITY_INFO[commodity];
          const cx = ci * COL + COL / 2;
          const rows = players.map((p) => ({
            email: p.email,
            was: p.tracks[commodity],
            now: Math.min(
              TOP_LEVEL,
              p.tracks[commodity] + countOf(p.ship || [], commodity),
            ),
          }));
          return (
            <g key={commodity}>
              <text
                x={cx}
                y={16}
                textAnchor="middle"
                fontSize="13"
                fontWeight="800"
                fill="#eee"
              >
                {info.emblem} {commodityName(commodity)}
              </text>
              {Array.from({ length: TOP_LEVEL + 1 }, (_, level) => {
                const w = 106 - level * 8;
                const y = BASE_Y - level * STEP;
                const bonus = TRACK_BONUS[level];
                return (
                  <g key={level}>
                    <rect
                      x={cx - w / 2}
                      y={y - STEP + 2}
                      width={w}
                      height={STEP - 3}
                      rx="4"
                      fill={level === 0 ? "#b8912f" : info.colour}
                      opacity={level === 0 ? 0.9 : 0.28 + level * 0.07}
                      stroke={level === 0 ? "#f2c25c" : "rgba(0,0,0,0.35)"}
                      strokeWidth="1"
                    />
                    {bonus && (
                      <text
                        x={cx + w / 2 - 4}
                        y={y - 7}
                        textAnchor="end"
                        fontSize="9"
                        fontWeight="800"
                        fill="#fff"
                        opacity="0.9"
                      >
                        +{bonus}
                      </text>
                    )}
                  </g>
                );
              })}
              {rows.map((r, i) => {
                const onLevel = rows.filter((o) => o.now === r.now);
                const slot = onLevel.indexOf(r);
                const spread = Math.min(16, 60 / Math.max(1, onLevel.length));
                const x = cx + (slot - (onLevel.length - 1) / 2) * spread - 10;
                const y = BASE_Y - r.now * STEP - STEP / 2 + 1;
                const colour = seatColour(gameState, r.email);
                const label = displayName(r.email);
                return (
                  <g key={r.email}>
                    {r.was !== r.now && (
                      <circle
                        cx={x}
                        cy={BASE_Y - r.was * STEP - STEP / 2 + 1}
                        r="6"
                        fill="none"
                        stroke={colour}
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    <g
                      className={`${classes.counter} ${r.was !== r.now ? classes.counterMoved : ""}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill={colour}
                        stroke={r.email === me ? "#fff" : "rgba(0,0,0,0.6)"}
                        strokeWidth={r.email === me ? 2.5 : 1.5}
                      >
                        <title>
                          {label}: level {r.now}
                          {r.was !== r.now ? ` (was ${r.was})` : ""}
                        </title>
                      </circle>
                      <text
                        x={x}
                        y={y + 3.5}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="900"
                        fill="#111"
                        pointerEvents="none"
                      >
                        {label.charAt(0).toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <Text size="xs" c="dimmed" ta="center">
        Counters stand where tonight's cargo will put them; a ring marks this
        morning's level. Top two on each track earn 10 and 5 a day; the top
        three levels add 5, 10 and 20.
      </Text>
    </div>
  );
}
