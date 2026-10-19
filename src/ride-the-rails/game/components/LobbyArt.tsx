/** A locomotive in a railroad's colour, puffing along. */
export default function LocomotiveCard({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 64 56" width="56" height="49" aria-hidden="true">
      <circle cx="46" cy="8" r="4" fill="rgba(255,255,255,0.35)" />
      <circle cx="52" cy="4" r="3" fill="rgba(255,255,255,0.25)" />
      <rect
        x="6"
        y="24"
        width="30"
        height="16"
        rx="3"
        fill={colour}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
      />
      <rect
        x="36"
        y="16"
        width="18"
        height="24"
        rx="2"
        fill={colour}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
      />
      <rect
        x="40"
        y="20"
        width="8"
        height="8"
        rx="1"
        fill="#fff6c8"
        opacity="0.9"
      />
      <rect x="40" y="12" width="6" height="8" fill="#3b2b1a" />
      <rect x="10" y="18" width="10" height="6" fill="#3b2b1a" />
      <rect x="2" y="40" width="58" height="4" fill="#3b2b1a" />
      <circle
        cx="14"
        cy="46"
        r="6"
        fill="#23262e"
        stroke="#9aa3b2"
        strokeWidth="1.5"
      />
      <circle
        cx="28"
        cy="46"
        r="6"
        fill="#23262e"
        stroke="#9aa3b2"
        strokeWidth="1.5"
      />
      <circle
        cx="46"
        cy="46"
        r="6"
        fill="#23262e"
        stroke="#9aa3b2"
        strokeWidth="1.5"
      />
      <path
        d="M 54 40 L 62 50 L 50 50 Z"
        fill={colour}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1"
      />
    </svg>
  );
}
