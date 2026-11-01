import type { StyleDesc } from '@ghia/solid';
import { For } from 'solid-js';

type ProgressiveBlurPosition = 'top' | 'bottom' | 'both';

interface ProgressiveBlurProps {
	position?: ProgressiveBlurPosition;
	height?: number | string;
	blurLevels?: number[];
	style?: StyleDesc;
}

function mask(position: ProgressiveBlurPosition, progress: number) {
	const percent = progress * 100;
	switch (position) {
		case 'bottom':
			return `linear-gradient(to bottom, transparent 0%, transparent ${percent}%, black ${percent + 10}%, black 100%)`;
		case 'top':
			return `linear-gradient(to top, transparent 0%, transparent ${percent}%, black ${percent + 10}%, black 100%)`;
		case 'both':
			return 'linear-gradient(transparent 0%, black 5%, black 95%, transparent 100%)';
	}
}

/**
 * Stacked layers of increasing blur, each masked to a band of the fade so the
 * whole thing reads as one smooth blur gradient instead of a hard edge.
 * Internal: not part of the package's public API. Place it inside a
 * positioned parent.
 */
export function ProgressiveBlur(props: ProgressiveBlurProps) {
	const position = () => props.position ?? 'bottom';
	const layers = () => {
		const levels = props.blurLevels ?? [0.5, 1, 2, 3, 4];
		return levels.map((blur, index) => ({
			blur,
			mask: mask(position(), index / (levels.length - 1)),
			zIndex: index + 1,
		}));
	};
	return (
		<div
			style={{
				pointerEvents: 'none',
				position: 'absolute',
				zIndex: 10,
				left: 0,
				right: 0,
				...(position() === 'top'
					? { top: 0 }
					: position() === 'bottom'
						? { bottom: 0 }
						: { top: 0, bottom: 0 }),
				height: position() === 'both' ? '100%' : (props.height ?? '30%'),
				...props.style,
			}}
		>
			<For each={layers()}>
				{(layer) => (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							zIndex: layer.zIndex,
							backdropFilter: `blur(${layer.blur}px)`,
							maskImage: layer.mask,
						}}
					/>
				)}
			</For>
		</div>
	);
}
