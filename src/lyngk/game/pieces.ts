import { Piece } from "./types";

/** The LYNGK palette: each colour nods to one of the earlier GIPF games. */
export const FILL: { [piece in Piece]: string } = {
  RED: "#d9342b",
  BLUE: "#2f6fd6",
  GREEN: "#2e9e5b",
  BLACK: "#1a1a1a",
  IVORY: "#f3e9d2",
  JOKER: "#ffffff",
};

export const STROKE: { [piece in Piece]: string } = {
  RED: "#7a120c",
  BLUE: "#163a78",
  GREEN: "#155233",
  BLACK: "#000",
  IVORY: "#9c8f6c",
  JOKER: "#9a9a9a",
};

/** Text that reads on top of each colour. */
export const INK: { [piece in Piece]: string } = {
  RED: "#fff",
  BLUE: "#fff",
  GREEN: "#fff",
  BLACK: "#fff",
  IVORY: "#222",
  JOKER: "#222",
};

export const label = (piece: Piece) =>
  piece === "JOKER" ? "joker" : piece.toLowerCase();
