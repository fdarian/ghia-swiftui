import { createContext, type JSX, useContext } from 'solid-js';
import type {
	ButtonRadius,
	ButtonSize,
	ButtonVariant,
} from '#src/components/button.tsx';

export interface ButtonDefaults {
	variant?: ButtonVariant;
	size?: ButtonSize;
	radius?: ButtonRadius;
}

const ButtonDefaultsContext = createContext<ButtonDefaults>({});

/**
 * Lets a container inject default `Button` `variant`/`size`/`radius` onto its
 * descendants. Any container that wants defaults must render this provider:
 * nothing walks the tree.
 */
export function ButtonDefaultsProvider(props: {
	value: ButtonDefaults;
	children?: JSX.Element;
}) {
	return (
		<ButtonDefaultsContext.Provider
			value={{
				get variant() {
					return props.value.variant;
				},
				get size() {
					return props.value.size;
				},
				get radius() {
					return props.value.radius;
				},
			}}
		>
			{props.children}
		</ButtonDefaultsContext.Provider>
	);
}

export function useButtonDefaults(): ButtonDefaults {
	return useContext(ButtonDefaultsContext);
}
