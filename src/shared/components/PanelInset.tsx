import { useEffect } from "react";

const SELECTOR = '[data-testid="action-panel"], [data-panel="bottom"]';

/**
 * Keeps the page clear of the fixed strip along the bottom. The strip's
 * height changes with the phase, the hand and the screen, so this measures
 * it and publishes it as --panel-h; the games' spacers read that instead of
 * guessing.
 */
export default function PanelInset() {
  useEffect(() => {
    const root = document.documentElement;
    let observed: Element | null = null;
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => apply());
    const apply = () => {
      const el = document.querySelector(SELECTOR);
      if (el !== observed) {
        if (observed && resize) resize.unobserve(observed);
        observed = el;
        if (el && resize) resize.observe(el);
      }
      const height = el ? el.getBoundingClientRect().height : 0;
      root.style.setProperty("--panel-h", `${Math.ceil(height) + 12}px`);
    };
    const mutations = new MutationObserver(apply);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", apply);
    apply();
    return () => {
      mutations.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--panel-h");
    };
  }, []);
  return null;
}
