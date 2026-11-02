import {
	Button,
	Checkbox,
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	FieldSet,
	FieldTitle,
	Icon,
	Input,
	NumberInput,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Text,
} from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import { Page, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

export function FieldDemo() {
	const [opens, setOpens] = createSignal(0);
	const [notify, setNotify] = createSignal(true);
	return (
		<Page title="Field">
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					flexWrap: 'wrap',
					alignItems: 'flex-start',
					gap: 24,
				}}
			>
				<Section
					width={400}
					title="FieldSet props mode: title, description, auto group and dividers"
				>
					<FieldSet
						title="Notifications"
						description="Choose how you hear about activity."
					>
						<Field label="Notify me" description="Sent to your email.">
							<Checkbox
								aria-label="Notify me"
								checked={notify()}
								onCheckedChange={setNotify}
							/>
						</Field>
						<Field label="Quiet hours">
							<NumberInput
								defaultValue={8}
								unit="h"
								size="small"
								style={{ width: 96 }}
							/>
						</Field>
						<Field label="Name" error="A name is required.">
							<Input aria-invalid size="small" style={{ width: 160 }} />
						</Field>
					</FieldSet>
				</Section>
				<Section
					width={400}
					title="Action row (only Buttons: no divider above, right aligned)"
				>
					<FieldSet title="Account">
						<Field label="Signed in as" description="ada@example.com">
							<Button size="small">Switch</Button>
						</Field>
						<Field>
							<Button size="small" variant="destructive">
								Sign out
							</Button>
							<Button size="small" variant="accent">
								Save
							</Button>
						</Field>
					</FieldSet>
				</Section>
				<Section
					width={400}
					title="Interactive row (onClick makes the row a button)"
				>
					<FieldSet>
						<FieldGroup>
							<Field
								testId="field-row"
								label="Open advanced settings"
								onClick={() => setOpens(opens() + 1)}
							>
								<Icon name="chevron-down" />
							</Field>
							<Field label="Disabled row" disabled onClick={() => {}} />
						</FieldGroup>
					</FieldSet>
					<Text testId="field-opens">{`${opens()}`}</Text>
				</Section>
				<Section
					width={400}
					title="Disabled rows: label, description and controls dim; glass controls included"
				>
					<FieldSet>
						<FieldGroup>
							<Field
								testId="field-disabled-glass"
								label="Glass button"
								description="Disabled field"
								disabled
							>
								<Button variant="glass" size="small">
									Edit
								</Button>
								<Button variant="glassAccent" size="small">
									Save
								</Button>
							</Field>
							<Field label="Glass select" disabled>
								<Select defaultValue="spotify">
									<SelectTrigger variant="glass" size="small">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="spotify">Spotify</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							<Field label="Input and checkbox" disabled>
								<Input size="small" style={{ width: 96 }} value="Ada" />
								<Checkbox aria-label="Disabled" checked />
							</Field>
							<Field label="Enabled, for comparison">
								<Button variant="glass" size="small">
									Edit
								</Button>
								<Button variant="glassAccent" size="small">
									Save
								</Button>
							</Field>
						</FieldGroup>
					</FieldSet>
				</Section>
				<Section
					width={400}
					title="Primitive mode: FieldContent, FieldTitle, FieldLabel, vertical"
				>
					<FieldSet title="Composed">
						<FieldGroup>
							<Field orientation="vertical">
								<FieldContent>
									<FieldTitle>Display name</FieldTitle>
									<FieldDescription>
										Shown next to your comments.
									</FieldDescription>
								</FieldContent>
								<Input placeholder="Ada Lovelace" />
							</Field>
							<Field orientation="vertical">
								<FieldContent>
									<FieldLabel htmlFor="field-demo-email">Email</FieldLabel>
									<FieldError
										errors={[
											{ message: 'Not a valid address.' },
											{ message: 'Already taken.' },
										]}
									/>
								</FieldContent>
								<Input id="field-demo-email" aria-invalid value="ada@" />
							</Field>
						</FieldGroup>
					</FieldSet>
				</Section>
				<Section width={400} title="FieldSeparator with content">
					<FieldSet>
						<FieldGroup>
							<Field label="Email sign in">
								<Button size="small">Continue</Button>
							</Field>
							<FieldSeparator>or</FieldSeparator>
							<Field label="Single sign-on">
								<Button size="small">Continue</Button>
							</Field>
						</FieldGroup>
					</FieldSet>
				</Section>
			</div>
		</Page>
	);
}

export async function fieldScenario(shot: Shot) {
	await shot.focus('field-row');
	await shot.capture('row-focus');
	await shot.click('field-row');
	shot.expectText('field-opens', '1');
	await shot.keys('Enter');
	shot.expectText('field-opens', '2');
}
