import type { HostElement, HostProps, StyleDesc } from '@ghia/solid';
import type { JSX } from 'solid-js';

/** What every component forwards to its root: host props minus the ones it merges itself. */
export interface HostAttributes extends Omit<HostProps, 'style'> {
	style?: StyleDesc;
	children?: JSX.Element;
	ref?: (element: HostElement) => void;
}
