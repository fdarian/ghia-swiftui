import type { KeyEvent } from '@ghia/solid';
import { batch } from 'solid-js';

export type ListNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function isListNavigationKey(
	key: string | undefined,
): key is ListNavigationKey {
	return (
		key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End'
	);
}

export function withKey(event: KeyEvent, key: string): KeyEvent {
	return Object.create(event, {
		key: { value: key },
		ctrlKey: { value: false },
	});
}

interface EnabledRowStep {
	event: KeyEvent;
	key: ListNavigationKey;
	/** Hands a key to the primitive's own handler, which moves the highlight. */
	forward: (event: KeyEvent) => void;
	highlighted: () => number | null;
	setHighlighted: (index: number | null) => void;
	isDisabled: (index: number) => boolean;
	rowCount: () => number;
}

/**
 * NSMenu and NSPopUpButton step over a disabled row, but the primitives' keys
 * land on it. The key is replayed to the primitive until the highlight comes
 * to rest on an enabled row; the batch holds back the row focus (an effect on
 * the highlight) until then. With no enabled row to reach, the highlight stays
 * where it started.
 */
export function stepToEnabledRow(step: EnabledRowStep) {
	const direction =
		step.key === 'Home' || step.key === 'ArrowDown' ? 'ArrowDown' : 'ArrowUp';
	batch(() => {
		const start = step.highlighted();
		step.forward(withKey(step.event, step.key));
		for (let tries = 0; tries < step.rowCount(); tries++) {
			const index = step.highlighted();
			if (index === null || !step.isDisabled(index)) return;
			step.forward(withKey(step.event, direction));
			// A list that stops at its ends does not move past the last row.
			if (step.highlighted() === index) break;
		}
		step.setHighlighted(start);
	});
}
