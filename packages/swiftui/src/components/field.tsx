import {
	type ButtonBehavior,
	buttonProps,
	useGpuixRequired,
} from '@ghia/solid';
import {
	createMemo,
	For,
	type JSX,
	children as resolveChildren,
	Show,
	splitProps,
} from 'solid-js';
import { isButtonElement } from '#src/components/button.tsx';
import {
	FieldDisabledContext,
	useFieldDisabled,
} from '#src/components/field-disabled-context.ts';
import { Label, type LabelProps } from '#src/components/label.tsx';
import { Separator } from '#src/components/separator.tsx';
import { Text } from '#src/components/text.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

/**
 * Elements made by `FieldGroup`, `FieldContent` and by a `Field` that is a
 * content row. A host element carries no component identity, so a parent
 * recognises composed children by the elements these register, once, when
 * they are created. A part wrapped in a `div` is not seen.
 */
const groupElements = new WeakSet<object>();
const contentElements = new WeakSet<object>();
const contentFieldElements = new WeakSet<object>();

function has(set: WeakSet<object>, node: unknown): boolean {
	return typeof node === 'object' && node !== null && set.has(node);
}

export interface FieldSetProps extends Omit<HostAttributes, 'title'> {
	/** Section header. Auto-rendered as a `FieldLegend`. */
	title?: JSX.Element;
	/** Optional section subtext under the legend. Auto-rendered as a `FieldDescription`. */
	description?: JSX.Element;
}

/**
 * A grouped section of related form rows. When `title` or `description` is
 * set, renders the legend and description automatically; if no direct child
 * is a `FieldGroup`, the children are wrapped in one (the rounded well
 * container).
 */
export function FieldSet(props: FieldSetProps) {
	const [own, rest] = splitProps(props, [
		'title',
		'description',
		'style',
		'children',
	]);
	const resolved = resolveChildren(() => own.children);
	const propsMode = () =>
		own.title !== undefined || own.description !== undefined;
	const alreadyHasGroup = () =>
		resolved.toArray().some((node) => has(groupElements, node));
	return (
		<div
			{...rest}
			role="group"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 24,
				...own.style,
			}}
		>
			<Show when={propsMode()}>
				{/* Out of the set's gap, as a `<legend>` is: 12px under the legend, 24px under the description. */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						marginBottom: own.description === undefined ? -24 : 0,
					}}
				>
					<Show when={own.title !== undefined}>
						<FieldLegend>{own.title}</FieldLegend>
					</Show>
					<Show when={own.description !== undefined}>
						<FieldDescription style={{ marginInline: 16, maxWidth: '100%' }}>
							{own.description}
						</FieldDescription>
					</Show>
				</div>
			</Show>
			<Show when={propsMode() && !alreadyHasGroup()} fallback={resolved()}>
				<FieldGroup>{resolved()}</FieldGroup>
			</Show>
		</div>
	);
}

export interface FieldLegendProps extends Omit<HostAttributes, 'color'> {
	variant?: 'legend' | 'label';
}

export function FieldLegend(props: FieldLegendProps) {
	const [own, rest] = splitProps(props, ['variant', 'style', 'children']);
	return (
		<Text
			{...rest}
			variant="strong"
			style={{
				marginBottom: 12,
				...((own.variant ?? 'legend') === 'legend' ? { marginInline: 16 } : {}),
				...own.style,
			}}
		>
			{own.children}
		</Text>
	);
}

export function FieldGroup(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children', 'ref']);
	const resolved = resolveChildren(() => own.children);
	// An action-only Field (just buttons) gets no divider above it: it belongs to the row before.
	const interspersed = createMemo(() => {
		const nodes = resolved.toArray();
		const result: JSX.Element[] = [];
		nodes.forEach((node, index) => {
			const previous = nodes[index - 1];
			if (
				index > 0 &&
				has(contentFieldElements, previous) &&
				has(contentFieldElements, node)
			) {
				result.push(<FieldSeparator />);
			}
			result.push(node);
		});
		return result;
	});
	return (
		<div
			{...rest}
			ref={(element) => {
				groupElements.add(element);
				own.ref?.(element);
			}}
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				overflow: 'hidden',
				borderRadius: styleTokens.radiusCard,
				backgroundColor: semanticColors.surfaceWell,
				...own.style,
			}}
		>
			{interspersed()}
		</div>
	);
}

export interface FieldProps
	extends Omit<HostAttributes, keyof ButtonBehavior>,
		ButtonBehavior {
	/** Row label. Auto-rendered as a `FieldLabel`. */
	label?: JSX.Element;
	/** Row subtext. Auto-rendered as a `FieldDescription`. */
	description?: JSX.Element;
	/** Validation error message. Auto-rendered as a `FieldError`. */
	error?: JSX.Element;
	/** Layout direction. Defaults to `horizontal` in props/action mode, else `vertical`. */
	orientation?: 'vertical' | 'horizontal';
	/** Applies destructive/error styling to the row. */
	'data-invalid'?: boolean;
}

/**
 * A single form row. A disabled row dims its label, description and controls
 * itself, each through `FieldDisabledContext`. When `label` is set, auto-builds the
 * `FieldContent`/`FieldLabel`/`FieldDescription`/`FieldError` stack and
 * right-aligns children as the control slot. Without `label`, children are
 * rendered as-is (primitive mode). With `onClick` the whole row is a button:
 * do not put an interactive child in it.
 */
export function Field(props: FieldProps) {
	const parentDisabled = useFieldDisabled();
	return (
		<FieldDisabledContext.Provider
			value={() => props.disabled === true || parentDisabled()}
		>
			<FieldRow {...props} />
		</FieldDisabledContext.Provider>
	);
}

// The children resolve in here, below the provider, so they can read it.
function FieldRow(props: FieldProps) {
	const renderer = useGpuixRequired();
	const [behavior, own, rest] = splitProps(
		props,
		[
			'disabled',
			'focusableWhenDisabled',
			'onClick',
			'onKeyDown',
			'onKeyUp',
			'tabIndex',
		],
		[
			'label',
			'description',
			'error',
			'orientation',
			'data-invalid',
			'style',
			'children',
			'ref',
		],
	);
	const resolved = resolveChildren(() => own.children);
	const hasError = () => own.error !== undefined && own.error !== null;
	const propsMode = () =>
		own.label !== undefined || own.description !== undefined || hasError();
	const isActionRow = () => {
		const nodes = resolved.toArray();
		return (
			!propsMode() &&
			nodes.length > 0 &&
			nodes.every((node) => isButtonElement(node))
		);
	};
	const orientation = () =>
		own.orientation ??
		(propsMode() || isActionRow() ? 'horizontal' : 'vertical');
	const isInteractive = () => behavior.onClick !== undefined;
	const isDisabled = () => behavior.disabled === true;

	const content = () => (
		<Show when={propsMode()} fallback={resolved()}>
			<Show
				when={own.description !== undefined || hasError()}
				fallback={
					<Show when={own.label !== undefined}>
						<FieldLabel>{own.label}</FieldLabel>
					</Show>
				}
			>
				<FieldContent>
					<Show when={own.label !== undefined}>
						<FieldLabel>{own.label}</FieldLabel>
					</Show>
					<Show when={own.description !== undefined}>
						<FieldDescription style={{ maxWidth: '100%' }}>
							{own.description}
						</FieldDescription>
					</Show>
					<Show when={hasError()}>
						<FieldError>{own.error}</FieldError>
					</Show>
				</FieldContent>
			</Show>
			<Show when={resolved.toArray().length > 0}>
				<div
					style={
						orientation() !== 'vertical'
							? {
									display: 'flex',
									flexDirection: 'row',
									flexWrap: 'wrap',
									alignItems: 'center',
									justifyContent: 'flex-end',
									gap: 8,
								}
							: {}
					}
				>
					{resolved()}
				</div>
			</Show>
		</Show>
	);

	return (
		<div
			{...rest}
			{...(isInteractive() ? buttonProps(behavior, renderer) : {})}
			role={isInteractive() ? 'button' : 'group'}
			tabIndex={
				isInteractive()
					? isDisabled() && behavior.focusableWhenDisabled !== true
						? -1
						: (behavior.tabIndex ?? 0)
					: undefined
			}
			formControl={
				isInteractive() ? (isDisabled() ? 'disabled' : 'enabled') : undefined
			}
			ref={(element) => {
				if (
					propsMode() ||
					resolved.toArray().some((node) => has(contentElements, node))
				) {
					contentFieldElements.add(element);
				}
				own.ref?.(element);
			}}
			style={{
				display: 'flex',
				width: '100%',
				gap: 12,
				minHeight: 48,
				paddingInline: 16,
				paddingBlock: 16,
				...(orientation() === 'vertical'
					? { flexDirection: 'column' }
					: { flexDirection: 'row', alignItems: 'center' }),
				// An action row drops its top padding so it reads as belonging to the row above.
				...(!propsMode() && isActionRow() && orientation() === 'horizontal'
					? { justifyContent: 'flex-end', paddingTop: 0 }
					: {}),
				...(isInteractive()
					? {
							cursor: 'default',
							textAlign: 'left',
							keyboardFocusDim: false,
							active: { backgroundColor: semanticColors.surfaceControlSubtle },
							focusVisible: {
								backgroundColor: semanticColors.surfaceControlSubtle,
							},
						}
					: {}),
				// No opacity on the row: the label, description and controls dim themselves.
				...(isDisabled() ? { pointerEvents: 'none' } : {}),
				...(own['data-invalid'] === true ? { color: colors.red } : {}),
				...own.style,
			}}
		>
			{content()}
		</div>
	);
}

export function FieldContent(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children', 'ref']);
	return (
		<div
			{...rest}
			ref={(element) => {
				contentElements.add(element);
				own.ref?.(element);
			}}
			style={{
				display: 'flex',
				flexDirection: 'column',
				flexGrow: 1,
				flexShrink: 1,
				flexBasis: 0,
				gap: 4,
				lineHeight: 1.375,
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

export function FieldLabel(props: LabelProps) {
	const [own, rest] = splitProps(props, ['style']);
	const disabled = useFieldDisabled();
	return (
		<Label
			{...rest}
			style={{
				width: 'fit-content',
				flexGrow: 1,
				flexShrink: 1,
				minWidth: 0,
				gap: 8,
				lineHeight: 1.375,
				...(disabled() ? { opacity: 0.5 } : {}),
				...own.style,
			}}
		/>
	);
}

export function FieldTitle(props: Omit<HostAttributes, 'color'>) {
	const [own, rest] = splitProps(props, ['style']);
	const disabled = useFieldDisabled();
	return (
		<Text
			{...rest}
			variant="strong"
			style={{
				display: 'flex',
				flexDirection: 'row',
				width: 'fit-content',
				alignItems: 'center',
				gap: 8,
				...(disabled() ? { opacity: 0.5 } : {}),
				...own.style,
			}}
		/>
	);
}

export function FieldDescription(props: Omit<HostAttributes, 'color'>) {
	const [own, rest] = splitProps(props, ['style']);
	const disabled = useFieldDisabled();
	return (
		<Text
			{...rest}
			as="p"
			variant="small"
			color="secondary"
			style={{
				maxWidth: 350,
				...(disabled() ? { opacity: 0.5 } : {}),
				...own.style,
			}}
		/>
	);
}

export function FieldSeparator(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Show
			when={own.children !== undefined}
			fallback={
				<Separator {...rest} style={{ marginInline: 16, ...own.style }} />
			}
		>
			<div
				{...rest}
				style={{
					position: 'relative',
					marginInline: 16,
					marginBlock: -8,
					height: 20,
					...own.style,
				}}
			>
				<Separator
					style={{ position: 'absolute', top: '50%', left: 0, right: 0 }}
				/>
				<span
					style={{
						position: 'relative',
						display: 'block',
						width: 'fit-content',
						marginInline: 'auto',
						paddingInline: 8,
						backgroundColor: semanticColors.background,
						color: semanticColors.textSecondary,
						fontSize: 13,
						lineHeight: '20px',
					}}
				>
					{own.children}
				</span>
			</div>
		</Show>
	);
}

export interface FieldErrorProps extends HostAttributes {
	errors?: ReadonlyArray<{ message?: string } | undefined>;
}

export function FieldError(props: FieldErrorProps) {
	const [own, rest] = splitProps(props, ['errors', 'style', 'children']);
	const messages = createMemo(() => {
		const unique = new Set<string>();
		for (const error of own.errors ?? []) {
			if (error?.message) unique.add(error.message);
		}
		return [...unique];
	});
	const hasContent = () =>
		resolved.toArray().length > 0 || messages().length > 0;
	const resolved = resolveChildren(() => own.children);
	return (
		<Show when={hasContent()}>
			<div
				{...rest}
				role="alert"
				style={{ fontSize: 13, color: colors.red, ...own.style }}
			>
				<Show
					when={resolved.toArray().length === 0 && messages().length > 1}
					fallback={
						<Show when={resolved.toArray().length > 0} fallback={messages()[0]}>
							{resolved()}
						</Show>
					}
				>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 4,
							marginLeft: 16,
						}}
					>
						<For each={messages()}>
							{(message) => <span>{`• ${message}`}</span>}
						</For>
					</div>
				</Show>
			</div>
		</Show>
	);
}
