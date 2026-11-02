import {
	type JSX,
	children as resolveChildren,
	Show,
	splitProps,
} from 'solid-js';
import { Button, type ButtonProps } from '#src/components/button.tsx';
import { Text } from '#src/components/text.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { Icon } from '#src/icons/icon.tsx';
import { IconSizeContext } from '#src/icons/icon-size.ts';
import { type TintColor, tint } from '#src/tint.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

export type CalloutColor = TintColor;

/**
 * Elements made by `Callout.Icon`, `.Text`, `.Actions` and `.Close`. A host
 * element carries no component identity, so the root recognises composed
 * children by the elements the parts register here.
 */
const parts = new WeakSet<object>();

function register(element: object) {
	parts.add(element);
}

export interface CalloutProps extends Omit<HostAttributes, 'color'> {
	/** Colour treatment matching Badge. */
	color?: CalloutColor;
	/** Leading icon for the props API. */
	icon?: JSX.Element;
	/** Trailing actions, usually one small Button. */
	actions?: JSX.Element;
	/** Adds a trailing dismiss button. */
	onDismiss?: () => void;
	/** Accessible label for the dismiss button. */
	dismissLabel?: string;
}

function CalloutRoot(props: CalloutProps) {
	const [own, rest] = splitProps(props, [
		'color',
		'icon',
		'actions',
		'onDismiss',
		'dismissLabel',
		'children',
		'style',
	]);
	const resolved = resolveChildren(() => own.children);
	const hasContent = () => resolved.toArray().length > 0;
	const composed = () =>
		resolved
			.toArray()
			.some(
				(node) => typeof node === 'object' && node !== null && parts.has(node),
			);
	const usesPropsApi = () =>
		own.icon !== undefined ||
		own.actions !== undefined ||
		own.onDismiss !== undefined;
	const simple = () => !usesPropsApi() && !composed();
	const rootStyle = () => ({
		display: 'flex',
		flexDirection: 'row',
		width: '100%',
		alignItems: 'center',
		borderRadius: styleTokens.radiusControl,
		padding: 12,
		...tint(own.color ?? 'secondary'),
	});
	return (
		<Show
			when={!simple()}
			fallback={
				<div
					{...rest}
					style={{
						...rootStyle(),
						justifyContent: 'center',
						textAlign: 'center',
						...own.style,
					}}
				>
					<Text variant="strong" color="inherit">
						{resolved()}
					</Text>
				</div>
			}
		>
			<div
				{...rest}
				style={{ ...rootStyle(), gap: 12, textAlign: 'left', ...own.style }}
			>
				<Show when={own.icon !== undefined}>
					<CalloutIcon>{own.icon}</CalloutIcon>
				</Show>
				<Show
					when={composed()}
					fallback={
						<Show when={hasContent()}>
							<CalloutText>{resolved()}</CalloutText>
						</Show>
					}
				>
					{resolved()}
				</Show>
				<Show when={own.actions !== undefined}>
					<CalloutActions>{own.actions}</CalloutActions>
				</Show>
				<Show when={own.onDismiss !== undefined}>
					<CalloutClose
						onClick={() => own.onDismiss?.()}
						label={own.dismissLabel}
					/>
				</Show>
			</div>
		</Show>
	);
}

function CalloutIcon(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			ref={register}
			style={{
				display: 'flex',
				flexShrink: 0,
				width: 16,
				height: 16,
				alignItems: 'center',
				justifyContent: 'center',
				...own.style,
			}}
		>
			<IconSizeContext.Provider value={() => 16}>
				{own.children}
			</IconSizeContext.Provider>
		</div>
	);
}

function CalloutText(props: Omit<HostAttributes, 'color'>) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text
			{...rest}
			ref={register}
			as="p"
			variant="strong"
			color="inherit"
			style={{ minWidth: 0, flex: 1, ...own.style }}
		>
			{own.children}
		</Text>
	);
}

function CalloutActions(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			ref={register}
			style={{
				display: 'flex',
				flexDirection: 'row',
				flexShrink: 0,
				alignItems: 'center',
				gap: 8,
				alignSelf: 'center',
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

export interface CalloutCloseProps extends Omit<ButtonProps, 'children'> {
	label?: string;
}

function CalloutClose(props: CalloutCloseProps) {
	const [own, rest] = splitProps(props, ['label', 'aria-label', 'style']);
	return (
		<Button
			{...rest}
			ref={register}
			iconOnly
			size="small"
			variant="transparent"
			aria-label={own['aria-label'] ?? own.label ?? 'Dismiss'}
			style={{
				// A `transparent` button is its bare icon: the close keeps a 20px target.
				width: 20,
				height: 20,
				alignSelf: 'center',
				...own.style,
			}}
		>
			<Icon name="x" size={14} />
		</Button>
	);
}

export const Callout = Object.assign(CalloutRoot, {
	Icon: CalloutIcon,
	Text: CalloutText,
	Actions: CalloutActions,
	Close: CalloutClose,
});
