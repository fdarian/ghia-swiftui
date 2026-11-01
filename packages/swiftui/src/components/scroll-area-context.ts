import type { HostElement } from '@ghia/solid';
import { createContext, useContext } from 'solid-js';

export interface ScrollAreaContextValue {
	/** The element that scrolls, once mounted. */
	viewport: () => HostElement | undefined;
	/** How far the toolbar covers the viewport's top edge. */
	topInset: () => number;
	/** How far the footer covers its bottom edge. */
	bottomInset: () => number;
	/** `listener` runs after the offset (`scroll`) or the content's size (`layout`) changed. Returns the unsubscribe. */
	subscribe: (listener: (reason: 'scroll' | 'layout') => void) => () => void;
}

/** Published by `ScrollArea` to its content: rows reveal themselves and `List` finds its end through it. */
const ScrollAreaContext = createContext<ScrollAreaContextValue>();

function useScrollAreaContext(): ScrollAreaContextValue | undefined {
	return useContext(ScrollAreaContext);
}

export { ScrollAreaContext, useScrollAreaContext };
