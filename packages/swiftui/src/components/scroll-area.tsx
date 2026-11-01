import {
	type DomEvent,
	type HostElement,
	motion,
	type ScrollEvent,
} from '@ghia/solid';
import {
	createScrollAreaRoot,
	createScrollAreaScrollbar,
	type ScrollAreaAxis,
} from 'base-ui-solid-gpuix/scroll-area';
import {
	type Accessor,
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	children as resolveChildren,
	Show,
	splitProps,
} from 'solid-js';
import { Button } from '#src/components/button.tsx';
import { ButtonDefaultsProvider } from '#src/components/button-defaults-context.tsx';
import { usePanelContext } from '#src/components/panel-context.ts';
import { ScrollAreaContext } from '#src/components/scroll-area-context.ts';
import { useSidebarContext } from '#src/components/sidebar-context.ts';
import { useSplitViewColumnContext } from '#src/components/split-view-column-context.ts';
import {
	Toolbar,
	ToolbarActions,
	ToolbarContent,
	ToolbarDescription,
	ToolbarTitle,
} from '#src/components/toolbar.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { Icon } from '#src/icons/icon.tsx';
import { layoutSize } from '#src/layout-size.ts';
import { hasNodes } from '#src/resolved.ts';
import { colors } from '#src/tokens/colors.ts';

/** Extra bottom offset in last-column ScrollAreas so the scrollbar's bottom pixel clears the macOS window's rounded corner. Added to any `scrollbarBottomOffset`. */
const LAST_COLUMN_SCROLLBAR_BOTTOM_OFFSET = 18;
const AT_BOTTOM_THRESHOLD_PX = 5;
const FADE_SIZE = 32;
/** How far content fades out over the toolbar's bottom edge and ahead of the footer's top edge. */
const INSET_FADE_SIZE = 12;
/** The bar's 3px margin plus its 12px width under the pointer: the track keeps this hit target while the visible bar widens inside it. */
const TRACK_SIZE = 15;
const BAR_MARGIN = 3;
const BAR_WIDTH = 8;
const BAR_HOVER_WIDTH = 12;

export interface ScrollAreaControl {
	/** Scroll to bottom unconditionally, properly setting internal tracking state. */
	forceScrollToBottom: () => void;
	/** Freeze auto-follow-bottom during a programmatic scroll correction; reference-counted. */
	suspendAutoFollow: () => void;
	/** Resume auto-follow-bottom; on the final resume the at-bottom belief is recomputed. */
	resumeAutoFollow: () => void;
}

export interface ScrollAreaProps extends Omit<HostAttributes, 'children'> {
	/** Escape hatch: pass a fully custom `<Toolbar>`. Takes precedence over `title`/`subtitle`/`actions`. */
	toolbar?: JSX.Element;
	/** Describes the active view (filename, selected item, section), not the app name. */
	title?: JSX.Element;
	subtitle?: JSX.Element;
	/** Action buttons, auto-styled with content-area defaults (`variant="glass" size="large"`). */
	actions?: JSX.Element;
	/** Leading-edge chrome before the title (e.g. a back button), auto-styled like `actions`. */
	leading?: JSX.Element;
	footer?: JSX.Element;
	children?: JSX.Element;
	viewportStyle?: HostAttributes['style'];
	fadeEdges?: boolean;
	autoScrollToBottom?: boolean;
	/** Read inside an effect: when its value changes and the viewport is at the bottom, it scrolls to the bottom again. syne's `autoScrollDeps` dependency list. */
	autoScrollDeps?: () => unknown;
	showScrollToBottomButton?: boolean;
	scrollbars?: 'vertical' | 'horizontal' | 'both';
	scrollbarBottomOffset?: number;
	scrollbarTopOffset?: number;
	/** Receives the imperative controls once mounted. */
	scrollControlRef?: (control: ScrollAreaControl) => void;
	/** The real scrolling element, for a caller that drives it directly. `ref` gives the same element. */
	viewportRef?: (element: HostElement) => void;
}

function MeasuredContainer(props: {
	position: 'top' | 'bottom';
	onHeightChange: (height: number) => void;
	children?: JSX.Element;
}) {
	return (
		<div
			onLayout={(event) =>
				props.onHeightChange(Math.round(layoutSize(event).height))
			}
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				zIndex: 10,
				...(props.position === 'top' ? { top: 0 } : { bottom: 0 }),
			}}
		>
			{props.children}
		</div>
	);
}

/** The scrollbar over one axis, drawn from the base-ui scroll area's thumb geometry. */
function Scrollbar(props: {
	axis: ScrollAreaAxis;
	bar: ReturnType<typeof createScrollAreaScrollbar>;
	/** The track's distance from the area's start and end edges along its axis. */
	start: number;
	end: number;
	testId?: string;
}) {
	const vertical = () => props.axis === 'y';
	const thickness = () =>
		props.bar.hovered() || props.bar.dragging() ? BAR_HOVER_WIDTH : BAR_WIDTH;
	return (
		<Show when={props.bar.span() !== null}>
			<div
				{...props.bar.trackProps}
				testId={props.testId}
				style={{
					position: 'absolute',
					zIndex: 15,
					userSelect: 'none',
					display: 'flex',
					flexDirection: 'column',
					...(vertical()
						? {
								right: 0,
								width: TRACK_SIZE,
								top: props.start,
								bottom: props.end,
								alignItems: 'flex-end',
							}
						: {
								bottom: 0,
								height: TRACK_SIZE,
								left: props.start,
								right: props.end,
								justifyContent: 'flex-end',
							}),
				}}
			>
				<div
					style={{
						position: 'relative',
						borderRadius: 9999,
						backgroundColor:
							props.bar.hovered() || props.bar.dragging()
								? colors.fg10
								: 'transparent',
						transition: 'all 150ms ease',
						...(vertical()
							? {
									width: thickness(),
									height: '100%',
									marginRight: BAR_MARGIN,
								}
							: {
									height: thickness(),
									width: '100%',
									marginBottom: BAR_MARGIN,
								}),
					}}
				>
					<div
						style={{
							position: 'absolute',
							borderRadius: 9999,
							backgroundColor: colors.fg40,
							...(vertical()
								? {
										left: 0,
										right: 0,
										top: props.bar.span()?.start,
										height: props.bar.span()?.length,
									}
								: {
										top: 0,
										bottom: 0,
										left: props.bar.span()?.start,
										width: props.bar.span()?.length,
									}),
						}}
					/>
				</div>
			</div>
		</Show>
	);
}

/** Props the scroll area turns into a `Toolbar`: a title block, then the actions on the trailing edge. */
function BuiltToolbar(props: {
	title?: JSX.Element;
	subtitle?: JSX.Element;
	actions?: JSX.Element;
	leading?: JSX.Element;
}) {
	return (
		<ButtonDefaultsProvider value={{ variant: 'glass', size: 'large' }}>
			<BuiltToolbarContent {...props} />
		</ButtonDefaultsProvider>
	);
}

function BuiltToolbarContent(props: {
	title?: JSX.Element;
	subtitle?: JSX.Element;
	actions?: JSX.Element;
	leading?: JSX.Element;
}) {
	// Resolved once and inside the defaults provider: a prop read twice would build its elements twice.
	const title = resolveChildren(() => props.title);
	const subtitle = resolveChildren(() => props.subtitle);
	const actions = resolveChildren(() => props.actions);
	const leading = resolveChildren(() => props.leading);
	const has = hasNodes;
	const hasTitleOrSubtitle = () => has(title) || has(subtitle);
	const titleBlock = () => (
		<Show when={hasTitleOrSubtitle()}>
			<ToolbarContent>
				<Show when={has(title)}>
					<ToolbarTitle>{title()}</ToolbarTitle>
				</Show>
				<Show when={has(subtitle)}>
					<ToolbarDescription>{subtitle()}</ToolbarDescription>
				</Show>
			</ToolbarContent>
		</Show>
	);
	return (
		<Show when={hasTitleOrSubtitle() || has(actions) || has(leading)}>
			<Toolbar>
				<Show when={has(leading)} fallback={titleBlock()}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
							minWidth: 0,
						}}
					>
						{leading()}
						{titleBlock()}
					</div>
				</Show>
				<Show when={has(actions)}>
					<ToolbarActions>{actions()}</ToolbarActions>
				</Show>
			</Toolbar>
		</Show>
	);
}

/**
 * Scrollable viewport with macOS-style scrollbars and slots for a sticky
 * toolbar (top) and footer (bottom), measured so content padding and
 * scrollbar insets never overlap. Provides auto-scroll-to-bottom tracking,
 * fade edges and an imperative `scrollControlRef`.
 *
 * The scroller is a native `overflow: 'scroll'` box with its own bar hidden;
 * the bars are drawn here from base-ui's scroll-area geometry, so they stay
 * between the toolbar and the footer.
 *
 * Inside a `Sidebar` the content fades out under the toolbar and the footer
 * instead of being blurred by them: the sidebar's glass is a native view, and
 * a `backdropFilter` painted over a native view blurs nothing.
 */
export function ScrollArea(props: ScrollAreaProps) {
	const [own, rest] = splitProps(props, [
		'toolbar',
		'title',
		'subtitle',
		'actions',
		'leading',
		'footer',
		'children',
		'style',
		'viewportStyle',
		'fadeEdges',
		'autoScrollToBottom',
		'autoScrollDeps',
		'showScrollToBottomButton',
		'scrollbars',
		'scrollbarBottomOffset',
		'scrollbarTopOffset',
		'scrollControlRef',
		'viewportRef',
		'ref',
	]);
	const column = useSplitViewColumnContext();
	const panel = usePanelContext();
	const isInLastColumn = () =>
		column?.isLast ??
		(panel?.isLastPanel === true && panel.orientation === 'horizontal');

	const scrollbars = () => own.scrollbars ?? 'vertical';
	const hasVerticalScrollbar = () =>
		scrollbars() === 'vertical' || scrollbars() === 'both';
	const hasHorizontalScrollbar = () =>
		scrollbars() === 'horizontal' || scrollbars() === 'both';
	const topOffset = () => own.scrollbarTopOffset ?? 0;
	const bottomOffset = () =>
		(own.scrollbarBottomOffset ?? 0) +
		(isInLastColumn() ? LAST_COLUMN_SCROLLBAR_BOTTOM_OFFSET : 0);

	const [toolbarHeight, setToolbarHeight] = createSignal(0);
	const [footerHeight, setFooterHeight] = createSignal(0);
	const [viewport, setViewport] = createSignal<HostElement>();
	const [atBottom, setAtBottom] = createSignal(true);
	const listeners = new Set<(reason: 'scroll' | 'layout') => void>();
	const notify = (reason: 'scroll' | 'layout') => {
		for (const listener of listeners) listener(reason);
	};

	const root = createScrollAreaRoot({
		orientation: () => scrollbars(),
		trackSize: TRACK_SIZE,
		thumbInset: 0,
		onScroll: () => notify('scroll'),
	});

	const mountedViewport = () => {
		const element = viewport();
		if (element === undefined) throw new Error('ScrollArea is not mounted');
		return element;
	};
	const distanceFromBottom = () => {
		const element = mountedViewport();
		return element.scrollHeight - element.scrollTop - element.clientHeight;
	};

	let isUserAtBottom = true;
	let suspendDepth = 0;
	let programmaticTimer: ReturnType<typeof setTimeout> | undefined;
	let isScrollingProgrammatically = false;
	onCleanup(() => clearTimeout(programmaticTimer));

	const recomputeIsAtBottom = () => {
		isUserAtBottom = distanceFromBottom() < AT_BOTTOM_THRESHOLD_PX;
		setAtBottom(isUserAtBottom);
	};
	const scrollingProgrammatically = (resetMs: number) => {
		isScrollingProgrammatically = true;
		clearTimeout(programmaticTimer);
		programmaticTimer = setTimeout(() => {
			isScrollingProgrammatically = false;
		}, resetMs);
	};
	const jumpToBottom = (resetMs: number) => {
		scrollingProgrammatically(resetMs);
		const element = mountedViewport();
		element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
	};
	const forceScrollToBottom = () => {
		isUserAtBottom = true;
		setAtBottom(true);
		jumpToBottom(200);
	};
	const scrollToBottom = () => {
		isUserAtBottom = true;
		scrollingProgrammatically(500);
		const element = mountedViewport();
		element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
	};
	const followBottom = (resetMs: number) => {
		if (own.autoScrollToBottom !== true) return;
		if (!isUserAtBottom || suspendDepth > 0) return;
		jumpToBottom(resetMs);
	};

	const control: ScrollAreaControl = {
		forceScrollToBottom,
		suspendAutoFollow() {
			suspendDepth += 1;
		},
		resumeAutoFollow() {
			if (suspendDepth === 0) return;
			suspendDepth -= 1;
			if (suspendDepth === 0) recomputeIsAtBottom();
		},
	};

	const onScroll = (event: ScrollEvent) => {
		root.viewportProps.onScroll(event);
		if (isScrollingProgrammatically || suspendDepth > 0) {
			setAtBottom(distanceFromBottom() < AT_BOTTOM_THRESHOLD_PX);
			return;
		}
		recomputeIsAtBottom();
	};

	let lastContentHeight: number | undefined;
	const onContentLayout = (event: DomEvent) => {
		const size = layoutSize(event);
		// The thumb's track ends before the scrollbar offsets, so the content it measures against is shorter by them.
		const measured: DomEvent = Object.create(event, {
			height: { value: size.height - topOffset() - bottomOffset() },
		});
		root.contentProps.onLayout(measured);
		const grew =
			lastContentHeight !== undefined && size.height !== lastContentHeight;
		lastContentHeight = size.height;
		if (grew) followBottom(50);
		notify('layout');
	};
	createEffect(
		on(
			[toolbarHeight, footerHeight],
			() => {
				followBottom(50);
				notify('layout');
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			() => own.autoScrollDeps?.(),
			() => {
				if (viewport() === undefined) return;
				followBottom(100);
			},
		),
	);

	createEffect(() => {
		own.scrollControlRef?.(control);
	});

	const fadeMask = () => {
		if (own.fadeEdges !== true) return undefined;
		const span = root.thumb('y');
		if (span === null) return undefined;
		const fadeTop = root.offset().y > 0.5;
		const fadeBottom = span.maxScroll - root.offset().y > 0.5;
		if (!fadeTop && !fadeBottom) return undefined;
		if (fadeTop && fadeBottom) {
			return `linear-gradient(to bottom, transparent 0px, black ${FADE_SIZE}px, black calc(100% - ${FADE_SIZE}px), transparent 100%)`;
		}
		if (fadeTop) {
			return `linear-gradient(to bottom, transparent 0px, black ${FADE_SIZE}px)`;
		}
		return `linear-gradient(to bottom, black calc(100% - ${FADE_SIZE}px), transparent 100%)`;
	};

	const overGlass = useSidebarContext();
	/**
	 * Opaque between the insets, fading to clear over the toolbar's bottom edge.
	 * Ahead of the footer the fade is as long as the scroll left, so a list at
	 * its end is not dimmed where it comes to rest against the footer.
	 */
	const insetMask = () => {
		const top = toolbarHeight();
		const bottom = footerHeight();
		const remaining = Math.max(
			0,
			(root.thumb('y')?.maxScroll ?? 0) - root.offset().y,
		);
		const bottomFade = Math.min(INSET_FADE_SIZE, remaining);
		const stops = [
			`transparent ${Math.max(0, top - INSET_FADE_SIZE)}px`,
			`black ${top}px`,
			`black calc(100% - ${bottom + bottomFade}px)`,
			`transparent calc(100% - ${bottom}px)`,
		];
		return `linear-gradient(to bottom, ${stops.join(', ')})`;
	};
	const viewportMask = () => (overGlass ? insetMask() : fadeMask());

	const verticalBar = createScrollAreaScrollbar(root, 'y', { thumbInset: 0 });
	const horizontalBar = createScrollAreaScrollbar(root, 'x', {
		thumbInset: 0,
	});

	return (
		<ScrollAreaContext.Provider
			value={{
				viewport,
				topInset: toolbarHeight,
				bottomInset: footerHeight,
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
			}}
		>
			<div
				{...rest}
				{...root.rootProps}
				style={{
					position: 'relative',
					...(hasVerticalScrollbar()
						? { height: '100%', maxHeight: '100vh' }
						: {}),
					...own.style,
				}}
			>
				<MeasuredContainer position="top" onHeightChange={setToolbarHeight}>
					<Show
						when={own.toolbar}
						fallback={
							<BuiltToolbar
								title={own.title}
								subtitle={own.subtitle}
								actions={own.actions}
								leading={own.leading}
							/>
						}
					>
						{(toolbar: Accessor<JSX.Element>) => toolbar()}
					</Show>
				</MeasuredContainer>
				{/* Reports the area between toolbar and footer: that, not the whole scroller, is what the thumb's track spans. */}
				<div
					onLayout={root.viewportProps.onLayout}
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: toolbarHeight() + topOffset(),
						bottom: footerHeight() + bottomOffset(),
						pointerEvents: 'none',
					}}
				/>
				<div
					ref={(element) => {
						root.viewportProps.ref(element);
						setViewport(element);
						own.ref?.(element);
						own.viewportRef?.(element);
					}}
					testId={
						rest.testId === undefined ? undefined : `${rest.testId}-viewport`
					}
					onScroll={onScroll}
					onWheel={root.viewportProps.onWheel}
					onKeyDown={root.viewportProps.onKeyDown}
					tabIndex={root.viewportProps.tabIndex}
					style={{
						width: '100%',
						height: '100%',
						paddingTop: toolbarHeight(),
						paddingBottom: footerHeight(),
						maskImage: viewportMask(),
						overflowX: hasHorizontalScrollbar() ? 'scroll' : 'hidden',
						overflowY: hasVerticalScrollbar() ? 'scroll' : 'hidden',
						overscrollBehaviorX: hasHorizontalScrollbar() ? 'contain' : 'auto',
						overscrollBehaviorY: hasVerticalScrollbar() ? 'contain' : 'auto',
						// The bars are drawn below: native ones would run under the toolbar.
						scrollbarWidth: 'none',
						keyboardFocusDim: false,
						...own.viewportStyle,
					}}
				>
					<div
						onLayout={onContentLayout}
						style={{
							display: 'flex',
							flexDirection: 'column',
							...(hasHorizontalScrollbar() ? { minWidth: 'fit-content' } : {}),
						}}
					>
						{own.children}
					</div>
				</div>
				<Show when={hasVerticalScrollbar()}>
					<Scrollbar
						axis="y"
						bar={verticalBar}
						start={toolbarHeight() + topOffset()}
						end={footerHeight() + bottomOffset()}
						testId={
							rest.testId === undefined ? undefined : `${rest.testId}-y-track`
						}
					/>
				</Show>
				<Show when={hasHorizontalScrollbar()}>
					<Scrollbar
						axis="x"
						bar={horizontalBar}
						start={0}
						end={root.corner()}
						testId={
							rest.testId === undefined ? undefined : `${rest.testId}-x-track`
						}
					/>
				</Show>
				<MeasuredContainer position="bottom" onHeightChange={setFooterHeight}>
					<Show when={own.footer}>
						{(footer: Accessor<JSX.Element>) => footer()}
					</Show>
				</MeasuredContainer>
				<Show when={own.showScrollToBottomButton}>
					<motion.div
						initial={false}
						animate={atBottom() ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						style={{
							position: 'absolute',
							right: 13,
							bottom: footerHeight() + bottomOffset() + topOffset() + 12,
							zIndex: 20,
							pointerEvents: atBottom() ? 'none' : 'auto',
						}}
					>
						<Button
							testId={
								rest.testId === undefined
									? undefined
									: `${rest.testId}-scroll-to-bottom`
							}
							onClick={scrollToBottom}
							size="small"
							iconOnly
							aria-label="Scroll to bottom"
						>
							<Icon name="arrow-down-to-line" />
						</Button>
					</motion.div>
				</Show>
			</div>
		</ScrollAreaContext.Provider>
	);
}
