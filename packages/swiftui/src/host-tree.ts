/** Whether `node` is `root` or sits somewhere below it in the element tree. */
export function contains(root: object, node: object | null): boolean {
	let current: object | null | undefined = node;
	while (current !== null && current !== undefined) {
		if (current === root) return true;
		current = (current as { parent?: object | null }).parent;
	}
	return false;
}
