import type { ReactNode } from "react";
import { LootCards } from "../types";

/*
 * One drawing system for every Razzia! card, after the rulebook: each suit
 * has an edge colour, a suit badge top-right, a red cross top-left on cards
 * that leave the game after scoring, a bold pictogram and a name band.
 * Pictograms are drawn in a 200×200 box and placed in the card's middle.
 */

const CREAM = "#f6edd0";
const INK = "#1c1f24";

type Suit = {
  colour: string;
  dark: string;
  /** Small glyph for the badge, drawn in a 40×40 box. */
  badge: ReactNode;
};

const SUITS = {
  jewels: {
    colour: "#c0392b",
    dark: "#7b1f16",
    badge: (
      <circle
        cx="20"
        cy="20"
        r="9"
        fill="none"
        stroke={CREAM}
        strokeWidth="5"
      />
    ),
  },
  bodyguards: {
    colour: "#7d3c98",
    dark: "#4a2159",
    badge: <path d="M8 16h22v8h-9l-3 8h-7l2-8H8z" fill={CREAM} />,
  },
  green: {
    colour: "#2e8b57",
    dark: "#1b5634",
    badge: (
      <>
        <circle
          cx="20"
          cy="20"
          r="11"
          fill="none"
          stroke={CREAM}
          strokeWidth="4"
        />
        <circle cx="20" cy="20" r="3" fill={CREAM} />
      </>
    ),
  },
  thieves: {
    colour: "#2980b9",
    dark: "#174a6b",
    badge: (
      <path
        d="M6 18c4-6 10-6 14 0 4-6 10-6 14 0v4c-4 6-10 6-14 0-4 6-10 6-14 0z"
        fill={CREAM}
      />
    ),
  },
  coins: {
    colour: "#d4a017",
    dark: "#8a6a0b",
    badge: (
      <>
        <ellipse cx="20" cy="24" rx="12" ry="5" fill={CREAM} />
        <ellipse
          cx="20"
          cy="16"
          rx="12"
          ry="5"
          fill={CREAM}
          stroke={INK}
          strokeWidth="1.5"
        />
      </>
    ),
  },
  businesses: {
    colour: "#8b5a2b",
    dark: "#56361a",
    badge: <path d="M20 6l14 28H6z" fill={CREAM} />,
  },
  police: {
    colour: "#e67e22",
    dark: "#9c4f0e",
    badge: (
      <path d="M20 5l4 9h10l-8 6 3 10-9-6-9 6 3-10-8-6h10z" fill={CREAM} />
    ),
  },
} satisfies { [key: string]: Suit };

type Spec = {
  name: string;
  suit: keyof typeof SUITS;
  /** Red cross: discarded after the round is scored. */
  discard: boolean;
  art: ReactNode;
};

/* ----------------------------------------------------------------------- */
/* Pictograms, each in a 200×200 box                                        */
/* ----------------------------------------------------------------------- */

const Scarab = (
  <g fill={CREAM} stroke={CREAM} strokeWidth="8" strokeLinecap="round">
    <circle cx="100" cy="52" r="18" />
    <ellipse cx="100" cy="118" rx="44" ry="60" />
    <line x1="100" y1="70" x2="100" y2="170" stroke={INK} strokeWidth="6" />
    <line x1="60" y1="80" x2="30" y2="60" />
    <line x1="60" y1="118" x2="24" y2="118" />
    <line x1="62" y1="152" x2="32" y2="176" />
    <line x1="140" y1="80" x2="170" y2="60" />
    <line x1="140" y1="118" x2="176" y2="118" />
    <line x1="138" y1="152" x2="168" y2="176" />
  </g>
);

const Cross = (
  <g fill={CREAM}>
    <rect x="82" y="20" width="36" height="160" rx="8" />
    <rect x="30" y="72" width="140" height="36" rx="8" />
    <circle
      cx="100"
      cy="90"
      r="14"
      fill="#c0392b"
      stroke={INK}
      strokeWidth="4"
    />
  </g>
);

const Bracelet = (
  <g>
    <circle
      cx="100"
      cy="100"
      r="62"
      fill="none"
      stroke={CREAM}
      strokeWidth="22"
    />
    {[0, 60, 120, 180, 240, 300].map((deg) => {
      const r = (deg * Math.PI) / 180;
      return (
        <circle
          key={deg}
          cx={100 + 62 * Math.cos(r)}
          cy={100 + 62 * Math.sin(r)}
          r="9"
          fill="#c0392b"
          stroke={INK}
          strokeWidth="3"
        />
      );
    })}
  </g>
);

const Tiara = (
  <g>
    <path
      d="M24 150 L24 90 L62 120 L100 50 L138 120 L176 90 L176 150 Z"
      fill={CREAM}
    />
    <rect x="24" y="150" width="152" height="22" fill={CREAM} />
    <circle
      cx="100"
      cy="62"
      r="11"
      fill="#c0392b"
      stroke={INK}
      strokeWidth="3"
    />
    <circle
      cx="62"
      cy="124"
      r="8"
      fill="#c0392b"
      stroke={INK}
      strokeWidth="3"
    />
    <circle
      cx="138"
      cy="124"
      r="8"
      fill="#c0392b"
      stroke={INK}
      strokeWidth="3"
    />
  </g>
);

const Ring = (
  <g>
    <circle
      cx="100"
      cy="122"
      r="48"
      fill="none"
      stroke={CREAM}
      strokeWidth="20"
    />
    <path
      d="M100 22 L132 54 L100 86 L68 54 Z"
      fill="#c0392b"
      stroke={CREAM}
      strokeWidth="8"
      strokeLinejoin="round"
    />
  </g>
);

const Bodyguard = (
  <g fill={CREAM}>
    <circle cx="100" cy="60" r="34" />
    <rect x="64" y="52" width="30" height="14" rx="4" fill={INK} />
    <rect x="106" y="52" width="30" height="14" rx="4" fill={INK} />
    <rect x="94" y="56" width="12" height="4" fill={INK} />
    <path d="M30 190 C30 130 60 108 100 108 C140 108 170 130 170 190 Z" />
    <path d="M100 112 L112 130 L100 186 L88 130 Z" fill={INK} />
  </g>
);

const GoldCoins = (
  <g>
    {[
      [64, 140],
      [136, 140],
      [100, 96],
    ].map(([cx, cy], i) => (
      <g key={i}>
        <ellipse cx={cx} cy={cy + 12} rx="46" ry="20" fill="#8a6a0b" />
        <ellipse
          cx={cx}
          cy={cy}
          rx="46"
          ry="20"
          fill="#ffe680"
          stroke="#6b4e00"
          strokeWidth="3"
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx="28"
          ry="11"
          fill="none"
          stroke="#6b4e00"
          strokeWidth="2.5"
        />
      </g>
    ))}
  </g>
);

const Car = (
  <g>
    <path
      d="M22 130 L38 92 L72 72 L130 72 L166 100 L182 110 L182 140 L22 140 Z"
      fill={CREAM}
    />
    <path d="M52 94 L76 80 L110 80 L110 100 L48 100 Z" fill={INK} />
    <path d="M120 80 L132 80 L156 100 L120 100 Z" fill={INK} />
    <circle cx="60" cy="142" r="20" fill={INK} stroke={CREAM} strokeWidth="8" />
    <circle
      cx="144"
      cy="142"
      r="20"
      fill={INK}
      stroke={CREAM}
      strokeWidth="8"
    />
  </g>
);

const Driver = (
  <g fill={CREAM}>
    <path d="M36 92 C36 48 164 48 164 92 Z" />
    <rect x="26" y="86" width="148" height="18" rx="6" />
    <path
      d="M60 104 L140 104 L150 122 L50 122 Z"
      fill={INK}
      stroke={CREAM}
      strokeWidth="6"
    />
    <circle cx="100" cy="150" r="32" />
    <circle cx="88" cy="146" r="4" fill={INK} />
    <circle cx="112" cy="146" r="4" fill={INK} />
  </g>
);

const Thief = (
  <g>
    <path d="M18 60 L182 60 L170 80 L30 80 Z" fill={CREAM} />
    <rect x="52" y="22" width="96" height="40" rx="6" fill={CREAM} />
    <path
      d="M22 118 C40 94 74 94 100 110 C126 94 160 94 178 118 L178 134 C160 160 128 160 100 136 C72 160 40 160 22 134 Z"
      fill={CREAM}
    />
    <ellipse cx="62" cy="124" rx="16" ry="10" fill={INK} />
    <ellipse cx="138" cy="124" rx="16" ry="10" fill={INK} />
  </g>
);

const Casino = (
  <g>
    <rect
      x="26"
      y="50"
      width="86"
      height="86"
      rx="14"
      fill={CREAM}
      transform="rotate(-12 69 93)"
    />
    <g fill={INK} transform="rotate(-12 69 93)">
      <circle cx="48" cy="72" r="8" />
      <circle cx="90" cy="72" r="8" />
      <circle cx="69" cy="93" r="8" />
      <circle cx="48" cy="114" r="8" />
      <circle cx="90" cy="114" r="8" />
    </g>
    <rect
      x="96"
      y="92"
      width="80"
      height="80"
      rx="14"
      fill={CREAM}
      transform="rotate(14 136 132)"
    />
    <g fill={INK} transform="rotate(14 136 132)">
      <circle cx="116" cy="112" r="8" />
      <circle cx="156" cy="152" r="8" />
    </g>
  </g>
);

const Transportation = (
  <g>
    <rect x="18" y="62" width="104" height="76" rx="6" fill={CREAM} />
    <path d="M122 82 L156 82 L182 112 L182 138 L122 138 Z" fill={CREAM} />
    <rect x="132" y="90" width="22" height="20" fill={INK} />
    <circle cx="52" cy="146" r="18" fill={INK} stroke={CREAM} strokeWidth="7" />
    <circle
      cx="150"
      cy="146"
      r="18"
      fill={INK}
      stroke={CREAM}
      strokeWidth="7"
    />
  </g>
);

const MovieTheatre = (
  <g>
    <rect x="26" y="84" width="148" height="92" rx="8" fill={CREAM} />
    <path d="M26 84 L152 38 L166 66 L40 112 Z" fill={CREAM} />
    {[0, 1, 2, 3].map((i) => (
      <path
        key={i}
        d={`M${40 + i * 30} ${107 - i * 11} l20 -7 l6 16 l-20 7 z`}
        fill={INK}
      />
    ))}
    <rect x="40" y="128" width="120" height="8" fill={INK} />
    <rect x="40" y="148" width="80" height="8" fill={INK} />
  </g>
);

const Racing = (
  <g>
    <rect x="30" y="20" width="10" height="170" rx="4" fill={CREAM} />
    {Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => (
        <rect
          key={`${row}-${col}`}
          x={44 + col * 26}
          y={26 + row * 22}
          width="26"
          height="22"
          fill={(row + col) % 2 === 0 ? CREAM : INK}
        />
      )),
    )}
    <rect
      x="44"
      y="26"
      width="130"
      height="88"
      fill="none"
      stroke={CREAM}
      strokeWidth="4"
    />
  </g>
);

const RealEstate = (
  <g>
    <path d="M30 86 L100 28 L170 86 Z" fill={CREAM} />
    <rect x="46" y="84" width="108" height="92" fill={CREAM} />
    {[0, 1, 2].map((row) =>
      [0, 1].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={62 + col * 46}
          y={96 + row * 26}
          width="30"
          height="16"
          fill={INK}
        />
      )),
    )}
    <rect x="88" y="150" width="24" height="26" fill={INK} />
  </g>
);

const Nightclub = (
  <g>
    <path d="M40 36 L160 36 L100 110 Z" fill={CREAM} />
    <rect x="94" y="108" width="12" height="52" fill={CREAM} />
    <rect x="62" y="158" width="76" height="12" rx="4" fill={CREAM} />
    <circle
      cx="122"
      cy="62"
      r="10"
      fill="#2e8b57"
      stroke={INK}
      strokeWidth="3"
    />
    <path
      d="M150 20 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z"
      fill={CREAM}
    />
    <path
      d="M32 140 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z"
      fill={CREAM}
    />
  </g>
);

const Restaurant = (
  <g fill={CREAM}>
    <rect x="56" y="24" width="10" height="150" rx="4" />
    <rect x="40" y="24" width="8" height="54" rx="3" />
    <rect x="72" y="24" width="8" height="54" rx="3" />
    <rect x="40" y="70" width="40" height="22" rx="8" />
    <path d="M130 24 C160 50 160 96 136 110 L136 174 L124 174 L124 24 Z" />
  </g>
);

const Police = (
  <g>
    <path
      d="M100 20 L164 44 L160 110 C156 150 130 174 100 184 C70 174 44 150 40 110 L36 44 Z"
      fill={CREAM}
    />
    <path
      d="M100 56 L112 84 L142 86 L118 104 L126 134 L100 118 L74 134 L82 104 L58 86 L88 84 Z"
      fill={INK}
    />
  </g>
);

/* ----------------------------------------------------------------------- */

const SPECS: { [card in LootCards]: Spec } = {
  SCARAB: { name: "Scarab", suit: "jewels", discard: true, art: Scarab },
  CROSS: { name: "Cross", suit: "jewels", discard: true, art: Cross },
  BRACELET: { name: "Bracelet", suit: "jewels", discard: true, art: Bracelet },
  TIARA: { name: "Tiara", suit: "jewels", discard: true, art: Tiara },
  RING: { name: "Ring", suit: "jewels", discard: true, art: Ring },
  BODYGUARDS: {
    name: "Bodyguard",
    suit: "bodyguards",
    discard: false,
    art: Bodyguard,
  },
  COINS: { name: "Gold coins", suit: "coins", discard: true, art: GoldCoins },
  CARS: { name: "Car", suit: "green", discard: false, art: Car },
  DRIVERS: { name: "Driver", suit: "green", discard: true, art: Driver },
  THIEF: { name: "Thief", suit: "thieves", discard: true, art: Thief },
  CASINO: { name: "Casino", suit: "businesses", discard: false, art: Casino },
  TRANSPORTATION: {
    name: "Transportation",
    suit: "businesses",
    discard: false,
    art: Transportation,
  },
  MOVIE_THEATER: {
    name: "Movie theatre",
    suit: "businesses",
    discard: false,
    art: MovieTheatre,
  },
  RACING: { name: "Racing", suit: "businesses", discard: false, art: Racing },
  REAL_ESTATE: {
    name: "Real estate",
    suit: "businesses",
    discard: false,
    art: RealEstate,
  },
  NIGHTCLUB: {
    name: "Nightclub",
    suit: "businesses",
    discard: false,
    art: Nightclub,
  },
  RESTAURANT: {
    name: "Restaurant",
    suit: "businesses",
    discard: false,
    art: Restaurant,
  },
  POLICE_RAIDS: {
    name: "Police raid",
    suit: "police",
    discard: false,
    art: Police,
  },
};

/** A complete card: frame, badge, discard cross, pictogram and name band. */
export default function LootCardArt({ card }: { card: LootCards }) {
  const spec = SPECS[card];
  const suit = SUITS[spec.suit];

  return (
    <svg
      viewBox="0 0 290 440"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="282" height="432" rx="22" fill={suit.colour} />
      <rect x="18" y="18" width="254" height="404" rx="14" fill={INK} />
      <rect
        x="18"
        y="18"
        width="254"
        height="404"
        rx="14"
        fill="none"
        stroke={suit.dark}
        strokeWidth="3"
      />

      {/* Suit badge */}
      <circle
        cx="242"
        cy="48"
        r="24"
        fill={suit.colour}
        stroke={suit.dark}
        strokeWidth="3"
      />
      <g transform="translate(222 28)">{suit.badge}</g>

      {/* Discarded after scoring */}
      {spec.discard && (
        <g transform="translate(48 48)">
          <circle r="20" fill="#c0392b" stroke={CREAM} strokeWidth="3" />
          <path
            d="M-9 -9 L9 9 M9 -9 L-9 9"
            stroke={CREAM}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Pictogram */}
      <g transform="translate(45 100)">{spec.art}</g>

      {/* Name band */}
      <rect x="18" y="352" width="254" height="70" rx="14" fill={suit.colour} />
      <rect x="18" y="352" width="254" height="14" fill={suit.colour} />
      <text
        x="145"
        y="396"
        textAnchor="middle"
        fontSize={spec.name.length > 11 ? 30 : 36}
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={CREAM}
      >
        {spec.name}
      </text>
    </svg>
  );
}
