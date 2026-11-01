import { createContext, type JSX, useContext } from 'solid-js';

export interface SplitViewContextValue {
	readonly hasSidebar: boolean;
	readonly sidebarCollapsed: boolean;
	setSidebarCollapsed: (collapsed: boolean) => void;
	toggleSidebar: () => void;
	readonly hasInspector: boolean;
	readonly inspectorCollapsed: boolean;
	setInspectorCollapsed: (collapsed: boolean) => void;
	toggleInspector: () => void;
	/**
	 * A pinned toggle hands over what to draw instead of drawing it: the
	 * `SplitView` shows it at a fixed frame position (the leading or trailing
	 * edge) whether the panel is open or collapsed. Returns the unregister.
	 */
	registerPinnedSidebarToggle: (render: () => JSX.Element) => () => void;
	registerPinnedInspectorToggle: (render: () => JSX.Element) => () => void;
	/** True while a pinned sidebar toggle is registered. Widens the primary toolbar's inset. */
	readonly hasPinnedSidebarToggle: boolean;
	/** True while any sidebar toggle is mounted. Gates ⌃⌘S. */
	readonly hasSidebarToggle: boolean;
	registerSidebarToggle: () => () => void;
	readonly hasInspectorToggle: boolean;
	registerInspectorToggle: () => () => void;
}

const SplitViewContext = createContext<SplitViewContextValue>();

function useSplitView(): SplitViewContextValue {
	const context = useContext(SplitViewContext);
	if (context === undefined) {
		throw new Error('useSplitView must be used inside a <SplitView>.');
	}
	return context;
}

export { SplitViewContext, useSplitView };
