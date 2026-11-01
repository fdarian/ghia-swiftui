import type { HostProps } from '@ghia/solid';

/** `aria-invalid` is `true` or `"true"`; `"grammar"` and `"spelling"` are not the validation failure the red ring marks. */
export function isInvalid(value: HostProps['aria-invalid']): boolean {
	return value === true || value === 'true';
}
