/** What a demo's `scenario` can do while `pnpm screenshot` renders it offscreen. */
export interface Shot {
	click(testId: string): Promise<void>;
	/** Throws unless the element's accessibility node reports this `checked` state. */
	expectChecked(testId: string, checked: boolean): void;
	capture(name: string): void;
}
