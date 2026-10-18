import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TigrisGameState } from "../types";
import {
  ALL_CELLS,
  COLOUR_HEX,
  COLS,
  DYNASTY_SYMBOL,
  components,
  isBorder,
  isKingdom,
  isRiver,
  key,
  label,
  parse,
  ROWS,
  SHEDU,
  squareCells,
} from "../board";
import { TileSymbol } from "./TileIcon";
import classes from "../tigris.module.css";

export type Highlight = "legal" | "offer" | "square";

const CELL = 40;
const PAD = 14;
const W = COLS * CELL + 2 * PAD;
const H = ROWS * CELL + 2 * PAD;
const MIN_W = W / 3;
type View = { x: number; y: number; w: number };
const FIT: View = { x: 0, y: 0, w: W };

function clampView(v: View): View {
  const w = Math.min(W, Math.max(MIN_W, v.w));
  const h = (w * H) / W;
  return {
    x: w >= W ? 0 : Math.min(W - w, Math.max(0, v.x)),
    y: w >= W ? 0 : Math.min(H - h, Math.max(0, v.y)),
    w,
  };
}

const px = (cell: string) => {
  const [r, c] = parse(cell);
  return { x: PAD + c * CELL, y: PAD + r * CELL };
};

/**
 * The map: river and land, tiles with their symbols, leaders with their
 * dynasty, monuments over their squares, treasures, and the outline of
 * every kingdom. Drag to pan, pinch or ctrl-wheel to zoom, double-tap to
 * fit.
 */
export default function Board({
  gameState,
  highlights,
  onCell,
  me,
}: {
  gameState: TigrisGameState;
  highlights: { [cell: string]: Highlight };
  onCell?: (cell: string) => void;
  me?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(FIT);
  const pointers = useRef(
    new globalThis.Map<number, { x: number; y: number }>(),
  );
  const gesture = useRef<{
    view: View;
    centre: { x: number; y: number };
    distance: number;
  } | null>(null);
  const dragged = useRef(false);

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setView((v) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || !rect.width) return v;
        const sx = clientX === undefined ? rect.width / 2 : clientX - rect.left;
        const sy = clientY === undefined ? rect.height / 2 : clientY - rect.top;
        const scale = v.w / rect.width;
        const mapX = v.x + sx * scale;
        const mapY = v.y + sy * scale;
        const w = Math.min(W, Math.max(MIN_W, v.w / factor));
        const ns = w / rect.width;
        return clampView({ x: mapX - sx * ns, y: mapY - sy * ns, w });
      });
    },
    [],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && view.w >= W) return;
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt, view.w]);

  const centreOf = (pts: { x: number; y: number }[]) => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  });
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      view,
      centre: centreOf(pts),
      distance:
        pts.length >= 2
          ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          : 0,
    };
    if (pts.length === 1) dragged.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const start = gesture.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const centre = centreOf(pts);
    if (Math.hypot(centre.x - start.centre.x, centre.y - start.centre.y) > 6)
      dragged.current = true;
    const scale = start.view.w / rect.width;
    let w = start.view.w;
    if (pts.length >= 2 && start.distance > 0) {
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      w = start.view.w / (distance / start.distance);
      if (Math.abs(distance - start.distance) > 4) dragged.current = true;
    }
    const w2 = Math.min(W, Math.max(MIN_W, w));
    const ns = w2 / rect.width;
    const mapX = start.view.x + (start.centre.x - rect.left) * scale;
    const mapY = start.view.y + (start.centre.y - rect.top) * scale;
    setView(
      clampView({
        x: mapX - (centre.x - rect.left) * ns,
        y: mapY - (centre.y - rect.top) * ns,
        w: w2,
      }),
    );
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else {
      const pts = [...pointers.current.values()];
      gesture.current = {
        view,
        centre: centreOf(pts),
        distance:
          pts.length >= 2
            ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
            : 0,
      };
    }
  };
  const tap = (cell: string) => {
    if (dragged.current || !onCell) return;
    onCell(cell);
  };

  const found = useMemo(() => components(gameState), [gameState]);
  const tiles = gameState.tiles || {};
  const leaders = gameState.leaders || {};
  const blocked = new Set(gameState.blocked || []);
  const squareOf = new globalThis.Map<string, string>();
  for (const m of gameState.monuments || [])
    for (const c of squareCells(m.cell)) squareOf.set(c, m.cell);
  const conflictCells = new Set(
    gameState.conflict
      ? [gameState.conflict.attackerCell, gameState.conflict.defenderCell]
      : [],
  );
  const last = gameState.lastAction;
  const landed =
    last && last.turn === gameState.turn && last.cell ? last.cell : null;

  // Kingdom outlines: every edge of a kingdom cell not shared with the same kingdom.
  const outlines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const comp of found.comps) {
    if (!isKingdom(comp)) continue;
    for (const cell of comp.cells) {
      const { x, y } = px(cell);
      const [r, c] = parse(cell);
      const edge = (rr: number, cc: number) =>
        rr < 0 ||
        rr >= ROWS ||
        cc < 0 ||
        cc >= COLS ||
        found.at[key(rr, cc)] !== comp.id;
      if (edge(r - 1, c)) outlines.push({ x1: x, y1: y, x2: x + CELL, y2: y });
      if (edge(r + 1, c))
        outlines.push({ x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL });
      if (edge(r, c - 1)) outlines.push({ x1: x, y1: y, x2: x, y2: y + CELL });
      if (edge(r, c + 1))
        outlines.push({ x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL });
    }
  }

  const h = (view.w * H) / W;
  return (
    <svg
      ref={svgRef}
      className={classes.board}
      viewBox={`${view.x} ${view.y} ${view.w} ${h}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => setView(FIT)}
      role="group"
      aria-label="The board"
    >
      <defs>
        <pattern
          id="tigris-water"
          width="12"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 4 q 3 -3 6 0 t 6 0"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      {/* Column letters and row numbers. */}
      {Array.from({ length: COLS }, (_, c) => (
        <text
          key={`c${c}`}
          x={PAD + c * CELL + CELL / 2}
          y={PAD - 4}
          textAnchor="middle"
          fontSize="8"
          fill="rgba(0,0,0,0.5)"
        >
          {String.fromCharCode(65 + c)}
        </text>
      ))}
      {Array.from({ length: ROWS }, (_, r) => (
        <text
          key={`r${r}`}
          x={PAD - 4}
          y={PAD + r * CELL + CELL / 2 + 3}
          textAnchor="end"
          fontSize="8"
          fill="rgba(0,0,0,0.5)"
        >
          {r + 1}
        </text>
      ))}

      {ALL_CELLS.map((cell) => {
        const { x, y } = px(cell);
        const river = isRiver(cell);
        const tile = tiles[cell];
        const leader = leaders[cell];
        const hl = highlights[cell];
        const tappable = !!onCell && !!hl;
        return (
          <g
            key={cell}
            data-testid={`cell-${cell}`}
            className={tappable ? classes.tappable : classes.cell}
            onClick={() => tap(cell)}
            role={tappable ? "button" : undefined}
            aria-label={`${label(cell)}${tile ? ` ${tile.colour.toLowerCase()} tile` : ""}${leader ? ` ${leader.colour.toLowerCase()} leader` : ""}`}
          >
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              fill={river ? "#5f9bd1" : "#e3d2a6"}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
            />
            {river && (
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                fill="url(#tigris-water)"
              />
            )}
            {SHEDU.includes(cell) && !tile && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 6}
                textAnchor="middle"
                fontSize="18"
                fill="rgba(120,90,30,0.5)"
              >
                ✦
              </text>
            )}
            {isBorder(cell) && (
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                fill="none"
                stroke="#b8860b"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            )}
            {blocked.has(cell) && (
              <g>
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx="4"
                  fill="#3a3330"
                />
                <path
                  d={`M ${x + 8} ${y + 8} L ${x + CELL - 8} ${y + CELL - 8} M ${x + CELL - 8} ${y + 8} L ${x + 8} ${y + CELL - 8}`}
                  stroke="#c0392b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            )}
            {tile && (
              <g
                key={`${cell}-${tile.colour}-${tile.down ? "d" : "u"}`}
                className={landed === cell ? classes.landed : undefined}
              >
                <rect
                  x={x + 3}
                  y={y + 3}
                  width={CELL - 6}
                  height={CELL - 6}
                  rx="5"
                  fill={tile.down ? "#2a2622" : COLOUR_HEX[tile.colour]}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="1.5"
                />
                {!tile.down && (
                  <g transform={`translate(${x} ${y})`}>
                    <TileSymbol colour={tile.colour} />
                  </g>
                )}
                {tile.treasure && (
                  <g>
                    <circle
                      cx={x + CELL - 9}
                      cy={y + 9}
                      r="6.5"
                      fill="#f3c33c"
                      stroke="#7a5a10"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={x + CELL - 9}
                      cy={y + 9}
                      r="2.5"
                      fill="#fff4c2"
                    />
                  </g>
                )}
              </g>
            )}
            {leader && (
              <g
                key={`${cell}-leader`}
                className={`${landed === cell ? classes.landed : ""} ${conflictCells.has(cell) ? classes.fighting : ""}`}
              >
                <circle
                  cx={x + CELL / 2}
                  cy={y + CELL / 2}
                  r="15"
                  fill="#fbf3e2"
                  stroke={COLOUR_HEX[leader.colour]}
                  strokeWidth="5"
                />
                {leader.email === me && (
                  <circle
                    cx={x + CELL / 2}
                    cy={y + CELL / 2}
                    r="18"
                    fill="none"
                    stroke="#ffd86b"
                    strokeWidth="2"
                  />
                )}
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 6}
                  textAnchor="middle"
                  fontSize="16"
                >
                  {
                    DYNASTY_SYMBOL[
                      gameState.players.find((p) => p.email === leader.email)
                        ?.dynasty ?? "ARCHER"
                    ]
                  }
                </text>
              </g>
            )}
            {gameState.unification === cell && (
              <path
                d={`M ${x + CELL / 2} ${y + 6} L ${x + CELL - 6} ${y + CELL / 2} L ${x + CELL / 2} ${y + CELL - 6} L ${x + 6} ${y + CELL / 2} Z`}
                fill="rgba(255, 216, 107, 0.55)"
                stroke="#7a5a10"
                strokeWidth="2"
              />
            )}
            {hl === "legal" && (
              <rect
                className={classes.legal}
                x={x + 3}
                y={y + 3}
                width={CELL - 6}
                height={CELL - 6}
                rx="5"
                fill="#ffd86b"
                stroke="#a67c00"
                strokeWidth="2"
              />
            )}
            {hl === "offer" && (
              <circle
                className={classes.legal}
                cx={x + CELL / 2}
                cy={y + CELL / 2}
                r="16"
                fill="none"
                stroke="#ffd86b"
                strokeWidth="4"
              />
            )}
            {hl === "square" && (
              <rect
                className={classes.legal}
                x={x + 2}
                y={y + 2}
                width={CELL - 4}
                height={CELL - 4}
                fill="rgba(255,216,107,0.35)"
                stroke="#ffd86b"
                strokeWidth="3"
              />
            )}
          </g>
        );
      })}

      {/* Monuments sit over their four facedown tiles. */}
      {(gameState.monuments || []).map((m) => {
        const { x, y } = px(m.cell);
        const cx = x + CELL;
        const cy = y + CELL;
        return (
          <g key={m.cell} pointerEvents="none">
            <rect
              x={cx - 26}
              y={cy - 2}
              width="52"
              height="22"
              rx="4"
              fill={COLOUR_HEX[m.colours[0]]}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth="1.5"
            />
            <rect
              x={cx - 16}
              y={cy - 18}
              width="32"
              height="18"
              rx="3"
              fill={COLOUR_HEX[m.colours[1]]}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth="1.5"
            />
            <rect
              x={cx - 7}
              y={cy - 28}
              width="14"
              height="12"
              rx="2"
              fill={COLOUR_HEX[m.colours[0]]}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth="1.5"
            />
          </g>
        );
      })}

      {outlines.map((o, i) => (
        <line
          key={i}
          x1={o.x1}
          y1={o.y1}
          x2={o.x2}
          y2={o.y2}
          stroke="#f7d774"
          strokeWidth="2.5"
          strokeLinecap="round"
          pointerEvents="none"
          opacity="0.9"
        />
      ))}
    </svg>
  );
}
