import {
	Callout,
	Checkbox,
	Field,
	FieldSet,
	Label,
	NumberInput,
	RadioGroup,
	RadioGroupItem,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	ShortcutRecorder,
	Text,
} from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import type { Shot } from '#src/demos/shot.ts';

/** Syne's settings view (`apps/desktop/src/settings/settings-view.tsx`) on the same parts, with local state for its queries and mutations. */
export function SettingsDemo() {
	const [openAtLogin, setOpenAtLogin] = createSignal(true);
	const [theme, setTheme] = createSignal('system');
	const [source, setSource] = createSignal('apple-music');
	const [days, setDays] = createSignal<number | null>(30);
	const [hotkey, setHotkey] = createSignal<string | null>('Control+Alt+KeyK');
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				overflow: 'auto',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 32,
					width: '100%',
					maxWidth: 560,
					paddingInline: 16,
					paddingBlock: 24,
					marginInline: 'auto',
				}}
			>
				<Text variant="heading2" as="h1" style={{ marginInline: 16 }}>
					Settings
				</Text>

				<FieldSet title="General">
					<Field
						label="Open at login"
						description="Blocked in System Settings — re-enable Syne under General → Login Items."
					>
						<Checkbox
							testId="settings-login"
							aria-label="Open at login"
							checked={openAtLogin()}
							onCheckedChange={setOpenAtLogin}
						/>
					</Field>
				</FieldSet>

				<FieldSet title="Appearance">
					<Field label="Theme">
						<RadioGroup
							value={theme()}
							onValueChange={setTheme}
							orientation="horizontal"
						>
							<Label>
								<RadioGroupItem testId="settings-theme-system" value="system" />
								Auto
							</Label>
							<Label>
								<RadioGroupItem testId="settings-theme-light" value="light" />
								Light
							</Label>
							<Label>
								<RadioGroupItem testId="settings-theme-dark" value="dark" />
								Dark
							</Label>
						</RadioGroup>
					</Field>
				</FieldSet>

				<FieldSet
					title="Listening"
					description="Choose which player to watch and how long history is kept."
				>
					<Field
						label="Music source"
						description="Only one player is polled at a time."
					>
						<Select value={source()} onValueChange={setSource}>
							<SelectTrigger testId="settings-source" variant="transparent">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem testId="settings-source-apple" value="apple-music">
									Apple Music
								</SelectItem>
								<SelectItem testId="settings-source-spotify" value="spotify">
									Spotify
								</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<Field
						label="Keep history for"
						description="Tracks older than this are deleted automatically."
					>
						<NumberInput
							testId="settings-days"
							value={days()}
							onValueChange={(value) => {
								if (value === null || value < 1) return;
								setDays(Math.floor(value));
							}}
							unit="days"
							min={1}
							max={365}
							step={1}
							style={{ width: 112 }}
						/>
					</Field>
				</FieldSet>

				<FieldSet
					title="Quick Entry"
					description="A floating command panel, summoned from anywhere."
				>
					<Field
						label="Global shortcut"
						description="Click the shortcut, then press a new key combination."
					>
						<ShortcutRecorder
							testId="settings-hotkey"
							value={hotkey()}
							onValueChange={setHotkey}
							size="small"
						/>
					</Field>
				</FieldSet>

				<Callout color="red">The sidecar is not running.</Callout>

				<div style={{ display: 'none' }}>
					<Text testId="settings-state">{`${theme()}|${source()}|${days()}|${hotkey()}`}</Text>
				</div>
			</div>
		</div>
	);
}

export async function settingsScenario(shot: Shot) {
	await shot.focus('settings-login');
	await shot.capture('focus');

	await shot.click('settings-source');
	await shot.capture('select-open');
	await shot.click('settings-source-spotify');
	await shot.wait(300);
	shot.expectText('settings-state', 'system|spotify|30|Control+Alt+KeyK');

	await shot.click('settings-source');
	await shot.capture('select-open-spotify');
	await shot.keys('Escape');
	await shot.wait(300);

	await shot.click('settings-theme-dark');
	await shot.click('settings-days-increment');
	shot.expectText('settings-state', 'dark|spotify|31|Control+Alt+KeyK');
	await shot.focus('settings-days');
	await shot.capture('number-focus');

	await shot.click('settings-hotkey');
	await shot.keys('Meta+Shift+j');
	shot.expectText('settings-state', 'dark|spotify|31|Shift+Cmd+KeyJ');
	await shot.click('settings-login');
	shot.expectChecked('settings-login', false);
	await shot.capture('edited');
}
