import type { DomEvent } from '@ghia/solid';

/** The border box an `onLayout` event reports: always present on a layout event. */
export function layoutSize(event: Pick<DomEvent, 'width' | 'height'>): {
	width: number;
	height: number;
} {
	if (event.width === undefined || event.height === undefined) {
		throw new Error('layout event without a size');
	}
	return { width: event.width, height: event.height };
}
