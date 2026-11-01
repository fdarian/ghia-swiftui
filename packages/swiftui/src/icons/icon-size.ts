import { type Accessor, createContext, useContext } from 'solid-js';

/** 16px is `style.iconMedium`, the macOS control-glyph size. */
export const DEFAULT_ICON_SIZE = 16;

/**
 * The size an `Icon` takes when it is not given one. Stands in for syne's
 * `LucideProvider`: a container sets it for the icons among its children,
 * since there is no descendant selector to size them from.
 */
export const IconSizeContext = createContext<Accessor<number>>(
	() => DEFAULT_ICON_SIZE,
);

export function useIconSize(): Accessor<number> {
	return useContext(IconSizeContext);
}
