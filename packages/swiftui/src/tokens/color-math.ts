interface Rgba {
	red: number;
	green: number;
	blue: number;
	alpha: number;
}

const HEX =
	/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})?$/;
const RGBA =
	/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

function parse(color: string): Rgba {
	const hex = HEX.exec(color);
	if (hex !== null) {
		return {
			red: Number.parseInt(hex[1] as string, 16),
			green: Number.parseInt(hex[2] as string, 16),
			blue: Number.parseInt(hex[3] as string, 16),
			alpha: hex[4] === undefined ? 1 : Number.parseInt(hex[4], 16) / 255,
		};
	}
	const rgba = RGBA.exec(color);
	if (rgba !== null) {
		return {
			red: Number(rgba[1]),
			green: Number(rgba[2]),
			blue: Number(rgba[3]),
			alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
		};
	}
	throw new Error(`Not a #rrggbb, #rrggbbaa or rgb()/rgba() colour: ${color}`);
}

function hexByte(value: number) {
	return Math.round(value).toString(16).padStart(2, '0');
}

function format(color: Rgba): string {
	if (color.alpha >= 1) {
		return `#${hexByte(color.red)}${hexByte(color.green)}${hexByte(color.blue)}`;
	}
	const alpha = Number(color.alpha.toFixed(4));
	return `rgba(${Math.round(color.red)},${Math.round(color.green)},${Math.round(color.blue)},${alpha})`;
}

/** `rgb(from <color> r g b / <alpha>)`: the same colour at `alpha` (0 to 1), whatever alpha it had. */
export function withAlpha(color: string, alpha: number): string {
	if (alpha < 0 || alpha > 1) {
		throw new Error(`Alpha must be between 0 and 1, got ${alpha}`);
	}
	return format({ ...parse(color), alpha });
}

/** `color-mix(in srgb, <base>, <other> <otherShare>)`, with `otherShare` from 0 to 1. */
export function mix(base: string, other: string, otherShare: number): string {
	const from = parse(base);
	const to = parse(other);
	const toward = (a: number, b: number) => a + (b - a) * otherShare;
	return format({
		red: toward(from.red, to.red),
		green: toward(from.green, to.green),
		blue: toward(from.blue, to.blue),
		alpha: toward(from.alpha, to.alpha),
	});
}

/** `top` painted over `bottom`, as two stacked translucent fills look. */
export function over(top: string, bottom: string): string {
	const front = parse(top);
	const back = parse(bottom);
	const alpha = front.alpha + back.alpha * (1 - front.alpha);
	if (alpha === 0) return format({ red: 0, green: 0, blue: 0, alpha: 0 });
	const channel = (a: number, b: number) =>
		(a * front.alpha + b * back.alpha * (1 - front.alpha)) / alpha;
	return format({
		red: channel(front.red, back.red),
		green: channel(front.green, back.green),
		blue: channel(front.blue, back.blue),
		alpha,
	});
}
