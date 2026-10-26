/**
 * The scroll element the library views live in.
 *
 * A grid that virtualizes its rows needs to know the height of the viewport it
 * scrolls in — the `.jf-scroll` of the content area — and to observe its
 * scrolling. That element is one level up from the grid, so the content view
 * hands it down to the grids through an injected getter rather than a prop.
 *
 * The getter, not the element, is what is injected: an element reference is null
 * until it has mounted, and a virtualizer may measure before then. A getter
 * returns whatever is there now, and a null answer is the signal to give up on
 * virtualizing and render every row instead.
 */
import { inject, type InjectionKey } from "vue";

/** The key a virtualizer injects its scroll element under. */
export const SCROLL_KEY = Symbol("tumult.jellyfin.scroll") as InjectionKey<() => HTMLElement | null>;

/** The scroll-element getter, or a getter that always reports none. */
export function useScroll(): () => HTMLElement | null {
    return inject(SCROLL_KEY, () => null);
}
