/** Money tokens are stored as "2".."16" and printed as thousands, like the board. */
export default function formatMoney(amount: string | number) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return String(amount);
  return `${n},000`;
}
