import { createContext, useContext } from 'solid-js';

export type ToolbarInset =
	| 'none'
	| 'windowControls'
	| 'windowControlsAndButton';

export interface SplitViewColumnContextValue {
	readonly isFirst: boolean;
	readonly isLast: boolean;
	/**
	 * If set, `Toolbar` uses this as its effective inset (overrides the normal
	 * `isFirst` resolution). Lets `SplitView` ask for `windowControlsAndButton`
	 * on the primary column while a pinned sidebar toggle is mounted, so content
	 * leaves room for the fixed button.
	 */
	readonly insetHint?: ToolbarInset;
	/** The `transition` `Toolbar` puts on its inset padding, in step with the collapse animation. */
	readonly insetTransition?: string;
}

const SplitViewColumnContext =
	createContext<SplitViewColumnContextValue | null>(null);

function useSplitViewColumnContext(): SplitViewColumnContextValue | null {
	return useContext(SplitViewColumnContext);
}

export { SplitViewColumnContext, useSplitViewColumnContext };
