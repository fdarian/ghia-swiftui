/** What a demo's `scenario` can do while `pnpm screenshot` renders it offscreen. */
export interface Shot {
	click(testId: string): Promise<void>;
	/** Clicks the first text element containing `text`, for controls that take no test id. */
	clickText(text: string): Promise<void>;
	/** Presses and releases the secondary button on the element's centre. */
	rightClick(testId: string): Promise<void>;
	/** Clicks 20px in from the element's right edge, where a trailing control sits. */
	clickEnd(testId: string): Promise<void>;
	/** Moves the pointer over the element's centre and leaves it there. */
	hover(testId: string): Promise<void>;
	/** Holds the primary button down on the element until `release`. */
	press(testId: string): Promise<void>;
	release(): Promise<void>;
	/** Moves the pointer off every element. */
	leave(): Promise<void>;
	/** Moves keyboard focus to the element, as Tab would: it shows its focus ring. */
	focus(testId: string): Promise<void>;
	/**
	 * Presses keys on whatever holds focus, as `ArrowDown`, `Shift+Tab`, `Meta+k`, `a`: a
	 * space-separated sequence, each press a keydown then a keyup, typed keys inserted into a
	 * focused input.
	 */
	keys(keystrokes: string): Promise<void>;
	/** Turns the wheel over the element's centre by `deltaY` px, positive scrolling down. */
	wheel(testId: string, deltaY: number): Promise<void>;
	/** Scrolls whatever scrolls around the element until it is in view, as `scrollIntoView` does. */
	reveal(testId: string): Promise<void>;
	/** Scrolls the element to `top` px, as `scrollTo` does. */
	scrollTo(testId: string, top: number): Promise<void>;
	/** Drags the primary button from the element's centre by `dx`, `dy` px and releases it. */
	drag(testId: string, dx: number, dy: number): Promise<void>;
	/** Presses on the element's centre and reports whether the window was asked to move: it sits in an `appRegion: 'drag'` box. */
	isDragRegion(testId: string): Promise<boolean>;
	/** Lets time pass, for animations. */
	wait(ms: number): Promise<void>;
	/** Throws unless the element's accessibility node reports this `checked` state. */
	expectChecked(testId: string, checked: boolean): void;
	/** Throws unless the element's text (its own, or its descendants' joined) equals `text`. */
	expectText(testId: string, text: string): void;
	/** Throws unless the element holds keyboard focus. */
	expectFocused(testId: string): void;
	/** The element's border box in window coordinates. */
	box(testId: string): { x: number; y: number; width: number; height: number };
	/** The element's `[scrollTop, scrollHeight, clientHeight]`. */
	scrollMetrics(testId: string): {
		scrollTop: number;
		scrollHeight: number;
		clientHeight: number;
	};
	/** Throws unless an element with this test id is in the tree. */
	expectPresent(testId: string): void;
	/** Throws if the element has a box: it was built and laid out. A virtual list builds only the rows near its viewport. */
	expectNotPainted(testId: string): void;
	/** Throws if an element with this test id is in the tree. */
	expectAbsent(testId: string): void;
	/** Writes `<name>-light.png` and `<name>-dark.png`, then restores light. */
	capture(name: string): Promise<void>;
}
