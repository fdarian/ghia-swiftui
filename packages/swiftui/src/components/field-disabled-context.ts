import { type Accessor, createContext, useContext } from 'solid-js';

/**
 * Whether the enclosing `Field` is disabled. A disabled `Field` cannot put
 * `opacity` on its root (a glass control inside would be drawn under its own
 * glass), so each control reads this and dims itself.
 */
export const FieldDisabledContext = createContext<Accessor<boolean>>(
	() => false,
);

export function useFieldDisabled(): Accessor<boolean> {
	return useContext(FieldDisabledContext);
}
