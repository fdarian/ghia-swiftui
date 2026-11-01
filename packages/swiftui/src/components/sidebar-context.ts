import { createContext, useContext } from 'solid-js';

/** Set inside a `Sidebar`: `Toolbar` reads it to tighten its padding and row height. */
const SidebarContext = createContext(false);

function useSidebarContext(): boolean {
	return useContext(SidebarContext);
}

export { SidebarContext, useSidebarContext };
