import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Side, TwixtGameState } from "../types";
import {
  colOf,
  isHole,
  label,
  linksOf,
  pegAt,
  rowOf,
  sameLink,
  SIDE_COLOUR,
  SIZE,
} from "../board";
import classes from "../twixt.module.css";

export type Highlight = "selectable" | "last" | "path" | "link";

const CANVAS = SIZE + 1;
const MIN_W = CANVAS / 4;
type View = { x: number; y: number; w: number };
const FIT: View = { x: 0, y: 0, w: CANVAS };

function clampView(v: View): View {
  const w = Math.min(CANVAS, Math.max(MIN_W, v.w));
  const clamp = (n: number) =>
    w >= CANVAS ? 0 : Math.min(CANVAS - w, Math.max(0, n));
  return { x: clamp(v.x), y: clamp(v.y), w };
}

/**
 * The TwixT board: a grid of holes with each side's border rows tinted,
 * pegs and links, and the winning chain lit. Drag to pan, pinch or
 * ctrl-wheel to zoom.
 */
export default function Board({
  gameState,
  highlights,
  mySide,
  selectedLink,
  onHole,
  onLink,
}: {
  gameState: TwixtGameState;
  highlights: { [hole: number]: Highlight };
  mySide?: Side;
  selectedLink?: Link;
  onHole?: (hole: number) => void;
  onLink?: (link: Link) => void;
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
        const px = clientX === undefined ? rect.width / 2 : clientX - rect.left;
        const py = clientY === undefined ? rect.height / 2 : clientY - rect.top;
        const scale = v.w / rect.width;
        const mapX = v.x + px * scale;
        const mapY = v.y + py * scale;
        const w = Math.min(CANVAS, Math.max(MIN_W, v.w / factor));
        const ns = w / rect.width;
        return clampView({ x: mapX - px * ns, y: mapY - py * ns, w });
      });
    },
    [],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && view.w >= CANVAS) return;
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
    const startScale = start.view.w / rect.width;
    let w = start.view.w;
    if (pts.length >= 2 && start.distance > 0) {
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      w = Math.min(
        CANVAS,
        Math.max(MIN_W, start.view.w * (start.distance / distance)),
      );
      dragged.current = true;
    }
    if (w >= CANVAS && pts.length === 1) return; // nothing to pan at full view
    const scale = w / rect.width;
    const mapX = start.view.x + (start.centre.x - rect.left) * startScale;
    const mapY = start.view.y + (start.centre.y - rect.top) * startScale;
    setView(
      clampView({
        x: mapX - (centre.x - rect.left) * scale,
        y: mapY - (centre.y - rect.top) * scale,
        w,
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
        centre: { x: pts[0].x, y: pts[0].y },
        distance: 0,
      };
    }
  };

  const holes = useMemo(() => {
    const out: number[] = [];
    for (let h = 0; h < SIZE * SIZE; h++) if (isHole(h)) out.push(h);
    return out;
  }, []);
  const links = linksOf(gameState);
  const last =
    gameState.lastMove?.type === "peg" ? gameState.lastMove.hole : undefined;
  const added = new Set(
    (gameState.lastMove?.added || []).map((l) => `${l[0]}-${l[1]}`),
  );
  const path = new Set(gameState.winningPath || []);
  const cx = (h: number) => colOf(h) + 0.5;
  const cy = (h: number) => rowOf(h) + 0.5;
  const tap = (fn: () => void) => () => {
    if (!dragged.current) fn();
  };

  return (
    <div className={classes.frame}>
      <div className={classes.zoomButtons} aria-label="Zoom">
        <button type="button" onClick={() => zoomAt(1.5)} aria-label="Zoom in">
          +
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.5)}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setView(FIT)}
          aria-label="Fit the board"
          style={{ fontSize: 12 }}
        >
          Fit
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
        style={{
          display: "block",
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          touchAction: view.w >= CANVAS ? "manipulation" : "none",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          background: "#e9dcc0",
          borderRadius: 10,
          cursor: view.w < CANVAS ? "grab" : undefined,
        }}
        role="group"
        aria-label="TwixT board"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Border bands: Red top and bottom, Black left and right. */}
        <rect
          x="1"
          y="0.1"
          width={SIZE - 2}
          height="0.8"
          fill="rgba(214,69,69,0.22)"
          rx="0.3"
        />
        <rect
          x="1"
          y={SIZE - 0.9}
          width={SIZE - 2}
          height="0.8"
          fill="rgba(214,69,69,0.22)"
          rx="0.3"
        />
        <rect
          x="0.1"
          y="1"
          width="0.8"
          height={SIZE - 2}
          fill="rgba(43,43,43,0.22)"
          rx="0.3"
        />
        <rect
          x={SIZE - 0.9}
          y="1"
          width="0.8"
          height={SIZE - 2}
          fill="rgba(43,43,43,0.22)"
          rx="0.3"
        />
        {/* Column letters and row numbers along the edges. */}
        {Array.from({ length: SIZE }, (_, i) => (
          <g
            key={`lab-${i}`}
            aria-hidden="true"
            fontSize="0.32"
            fill="rgba(0,0,0,0.45)"
            textAnchor="middle"
          >
            <text x={i + 0.5} y={SIZE + 0.75}>
              {String.fromCharCode(65 + i)}
            </text>
            <text x={SIZE + 0.55} y={i + 0.62}>
              {i + 1}
            </text>
          </g>
        ))}
        {holes.map((h) => {
          const peg = pegAt(gameState, h);
          const hl = highlights[h];
          const clickable = !!onHole && hl === "selectable";
          return (
            <g
              key={h}
              className={clickable ? "point" : undefined}
              onClick={clickable ? tap(() => onHole(h)) : undefined}
              role={clickable ? "button" : undefined}
              aria-label={`${label(h)}${peg ? `, ${peg.toLowerCase()} peg` : ""}${hl ? ` (${hl})` : ""}`}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " "))
                  onHole(h);
              }}
              style={{ cursor: clickable ? "pointer" : undefined }}
            >
              {/* A generous invisible target so taps land. */}
              <circle cx={cx(h)} cy={cy(h)} r="0.5" fill="transparent" />
              {!peg && (
                <circle
                  cx={cx(h)}
                  cy={cy(h)}
                  r={clickable ? 0.16 : 0.11}
                  fill={
                    clickable && mySide
                      ? `${SIDE_COLOUR[mySide]}55`
                      : "rgba(0,0,0,0.3)"
                  }
                  stroke={clickable && mySide ? SIDE_COLOUR[mySide] : "none"}
                  strokeWidth="0.04"
                />
              )}
            </g>
          );
        })}
        {links.map((l) => {
          const mine =
            mySide !== undefined && pegAt(gameState, l[0]) === mySide;
          const selected = !!selectedLink && sameLink(selectedLink, l);
          const key = `${l[0]}-${l[1]}`;
          const colour = SIDE_COLOUR[pegAt(gameState, l[0]) || "RED"];
          const onPath = path.has(l[0]) && path.has(l[1]);
          const clickable = !!onLink && mine;
          return (
            <g
              key={key}
              onClick={clickable ? tap(() => onLink(l)) : undefined}
              style={{ cursor: clickable ? "pointer" : undefined }}
              role={clickable ? "button" : undefined}
              aria-label={`link ${label(l[0])} to ${label(l[1])}${selected ? " (selected)" : ""}`}
            >
              <line
                x1={cx(l[0])}
                y1={cy(l[0])}
                x2={cx(l[1])}
                y2={cy(l[1])}
                stroke="transparent"
                strokeWidth="0.5"
              />
              <line
                className={added.has(key) ? "piece-drop" : undefined}
                x1={cx(l[0])}
                y1={cy(l[0])}
                x2={cx(l[1])}
                y2={cy(l[1])}
                stroke={selected ? "#ffd86b" : onPath ? "#ffd86b" : colour}
                strokeWidth={selected || onPath ? 0.22 : 0.14}
                strokeLinecap="round"
                style={{ transformOrigin: `${cx(l[0])}px ${cy(l[0])}px` }}
              />
            </g>
          );
        })}
        {holes.map((h) => {
          const peg = pegAt(gameState, h);
          if (!peg) return null;
          return (
            <circle
              key={`peg-${h}`}
              className={last === h ? "piece-drop" : undefined}
              cx={cx(h)}
              cy={cy(h)}
              r={path.has(h) ? 0.36 : 0.3}
              fill={SIDE_COLOUR[peg]}
              stroke={path.has(h) || last === h ? "#ffd86b" : "rgba(0,0,0,0.5)"}
              strokeWidth={path.has(h) || last === h ? 0.08 : 0.04}
              style={{
                transformOrigin: `${cx(h)}px ${cy(h)}px`,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </svg>
      <div className={classes.hint} aria-hidden="true">
        pinch or ctrl+scroll to zoom · drag to pan when zoomed
      </div>
    </div>
  );
}
