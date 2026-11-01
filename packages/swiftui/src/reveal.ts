import type { HostElement } from '@ghia/solid';
import { createEffect, on, onCleanup, onMount } from 'solid-js';
import type { ScrollAreaContextValue } from '#src/components/scroll-area-context.ts';

/** Room kept below the selected row, as syne's `scroll-margin-block-end`. */
const REVEAL_MARGIN_END = 16;

/** Scrolls `element` into the visible part of the scroller: below the toolbar and above the footer. */
export function revealInScrollArea(
	scroll: ScrollAreaContextValue | undefined,
	element: HostElement,
) {
	const viewport = scroll?.viewport();
	if (scroll === undefined || viewport === undefined) {
		element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
		return;
	}
	const area = viewport.getBoundingClientRect();
	const box = element.getBoundingClientRect();
	const top = area.top + scroll.topInset();
	const bottom = area.bottom - scroll.bottomInset() - REVEAL_MARGIN_END;
	if (box.top < top) {
		viewport.scrollBy({ top: box.top - top, behavior: 'instant' });
	} else if (box.bottom > bottom) {
		viewport.scrollBy({ top: box.bottom - bottom, behavior: 'instant' });
	}
}

/** How long after a row is selected it keeps re-revealing as the scroll area's layout settles. */
const SETTLE_MS = 400;

/**
 * Reveals a row in its scroll area when it becomes selected, or the selected
 * row moves. The first layout of a window arrives after the first paint, and
 * the toolbar's height after that, so the reveal is repeated on each layout
 * change for a moment instead of trusting the geometry of the frame it was
 * asked in.
 */
export function createRevealOnSelect(options: {
	scroll: ScrollAreaContextValue | undefined;
	row: () => HostElement | undefined;
	selected: () => boolean;
	/** Where the row sits in its list: a move of the selected row reveals it again. */
	position?: () => number;
}) {
	let pending = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));

	const attempt = () => {
		const row = options.row();
		if (row === undefined) return;
		const box = row.getBoundingClientRect();
		// Not laid out yet: the layout that does lay it out will call again.
		if (box.width === 0 && box.height === 0) return;
		revealInScrollArea(options.scroll, row);
	};

	onMount(() => {
		if (options.scroll === undefined) return;
		onCleanup(
			options.scroll.subscribe((reason) => {
				if (pending && reason === 'layout') attempt();
			}),
		);
	});

	createEffect(
		on(
			[options.selected, options.position ?? (() => 0)],
			([selected, position], previous) => {
				const wasSelected = previous?.[0] === true;
				const becameSelected = selected && !wasSelected;
				const moved = selected && wasSelected && position !== previous?.[1];
				if (!becameSelected && !moved) return;
				pending = true;
				clearTimeout(timer);
				timer = setTimeout(() => {
					pending = false;
				}, SETTLE_MS);
				attempt();
			},
		),
	);
}
