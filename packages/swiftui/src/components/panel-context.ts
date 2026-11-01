import { createContext, useContext } from 'solid-js';

export interface PanelContextValue {
	readonly panelIndex: number;
	readonly isFirstPanel: boolean;
	readonly isLastPanel: boolean;
	readonly orientation: 'horizontal' | 'vertical';
}

/**
 * Published by `PanelGroup` to each `Panel`'s children. `Toolbar` reads
 * `isFirstPanel` and `orientation` for its window-control inset when no
 * `SplitView` column context is present. The fields are getters: a panel's
 * place changes when a sibling mounts.
 */
const PanelContext = createContext<PanelContextValue | null>(null);

function usePanelContext(): PanelContextValue | null {
	return useContext(PanelContext);
}

export { PanelContext, usePanelContext };
