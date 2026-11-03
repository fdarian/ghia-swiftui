import { type Accessor, createContext, useContext } from 'solid-js';

/**
 * Whether the enclosing `Field` is disabled. A disabled `Field` puts no
 * `opacity` on its root: each control reads this and dims itself.
 */
export const FieldDisabledContext = createContext<Accessor<boolean>>(
	() => false,
);

export function useFieldDisabled(): Accessor<boolean> {
	return useContext(FieldDisabledContext);
}
