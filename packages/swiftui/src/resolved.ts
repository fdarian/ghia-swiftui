import type { ChildrenReturn } from 'solid-js';

/** The nodes of resolved children: a fragment's `<Show>` that is closed leaves an `undefined` in `toArray()`, which is no child. */
export function nodesOf(resolved: ChildrenReturn): unknown[] {
	return resolved
		.toArray()
		.filter(
			(node) =>
				node !== null &&
				node !== undefined &&
				typeof node !== 'boolean' &&
				node !== '',
		);
}

export function hasNodes(resolved: ChildrenReturn): boolean {
	return nodesOf(resolved).length > 0;
}
