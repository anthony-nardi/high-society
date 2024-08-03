export default function getLobbyIdFromURL() {
  return Number(window.location.hash.replace(/\D/g, ""));
}
