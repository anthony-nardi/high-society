/** True when the app is served from a local dev server (emulators, debug helpers). */
export default function isLocalhost(hostname = window.location.hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}
