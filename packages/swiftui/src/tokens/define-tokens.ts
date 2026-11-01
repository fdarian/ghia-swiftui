/**
 * An object whose properties read their value on every access, so a token
 * touched inside a JSX prop or an effect re-runs when the scheme or accent
 * signal it depends on changes. Read tokens there, never at module scope.
 */
export function defineTokens<Name extends string, Value>(
	definitions: Record<Name, () => Value>,
): Readonly<Record<Name, Value>> {
	const descriptors: PropertyDescriptorMap = {};
	for (const name of Object.keys(definitions) as Name[]) {
		descriptors[name] = { enumerable: true, get: definitions[name] };
	}
	return Object.defineProperties({} as Record<Name, Value>, descriptors);
}
