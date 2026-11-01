import { Button, Icon, Menu, Text } from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

export function MenuDemo() {
	const [picked, setPicked] = createSignal('none');
	const [opens, setOpens] = createSignal(0);
	const [external, setExternal] = createSignal(false);
	return (
		<Page title="Menu">
			<Section title="Dropdown from a button">
				<Row gap={24}>
					<Cell label="opens below, left edges aligned">
						<Menu.Root
							onOpenChange={(open) => {
								if (open) setOpens(opens() + 1);
							}}
						>
							<Menu.Trigger>
								<Button testId="menu-trigger" variant="filled">
									Actions
								</Button>
							</Menu.Trigger>
							<Menu.Portal>
								<Menu.Positioner side="bottom" align="start" sideOffset={4}>
									<Menu.Popup testId="menu-popup">
										<Menu.Item
											testId="menu-show"
											label="Show in Apple Music"
											onClick={() => setPicked('show')}
										>
											<Icon name="external-link" />
											Show in Apple Music
										</Menu.Item>
										<Menu.Item
											testId="menu-rename"
											label="Rename"
											disabled
											onClick={() => setPicked('rename')}
										>
											<Icon name="star" />
											Rename
										</Menu.Item>
										<Menu.Item
											testId="menu-delete"
											label="Delete Entry"
											closeOnClick={false}
											onClick={() => setPicked('delete')}
										>
											<Icon name="trash" />
											Delete Entry
										</Menu.Item>
									</Menu.Popup>
								</Menu.Positioner>
							</Menu.Portal>
						</Menu.Root>
					</Cell>
					<Cell label="picked">
						<Text testId="menu-picked">{picked()}</Text>
					</Cell>
					<Cell label="opened">
						<Text testId="menu-opens">{`${opens()}`}</Text>
					</Cell>
				</Row>
			</Section>
			<Section title="Opened from outside (controlled), opens above, right edges aligned">
				<Row gap={24}>
					<Cell label="trigger button">
						<Menu.Root open={external()} onOpenChange={setExternal}>
							<Menu.Trigger>
								<Button testId="menu-external-trigger" variant="muted">
									More
								</Button>
							</Menu.Trigger>
							<Menu.Portal>
								<Menu.Positioner side="top" align="end" sideOffset={4}>
									<Menu.Popup testId="menu-external-popup">
										<Menu.Item testId="menu-external-a" label="First">
											First
										</Menu.Item>
										<Menu.Item testId="menu-external-b" label="Second">
											Second
										</Menu.Item>
									</Menu.Popup>
								</Menu.Positioner>
							</Menu.Portal>
						</Menu.Root>
					</Cell>
					<Cell label="opens it">
						<Button
							testId="menu-external-open"
							variant="filled"
							onClick={() => setExternal(true)}
						>
							Open
						</Button>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function menuScenario(shot: Shot) {
	await shot.click('menu-trigger');
	await shot.wait(200);
	shot.expectPresent('menu-popup');
	shot.expectText('menu-opens', '1');
	await shot.capture('open');
	await shot.hover('menu-show');
	await shot.capture('hover');

	// A disabled row neither takes the highlight nor picks.
	await shot.click('menu-rename');
	shot.expectText('menu-picked', 'none');
	shot.expectPresent('menu-popup');

	// `closeOnClick={false}`: picks and stays open.
	await shot.click('menu-delete');
	shot.expectText('menu-picked', 'delete');
	shot.expectPresent('menu-popup');

	await shot.click('menu-show');
	await shot.wait(300);
	shot.expectText('menu-picked', 'show');
	shot.expectAbsent('menu-popup');

	// Keyboard: ArrowDown on the focused trigger opens on the first row, Ctrl+N steps (the disabled row is a stop too), Enter picks.
	await shot.focus('menu-trigger');
	await shot.keys('ArrowDown');
	await shot.wait(200);
	shot.expectPresent('menu-popup');
	await shot.keys('Control+n Control+n');
	await shot.capture('keyboard');
	await shot.keys('Control+p Control+n');
	await shot.keys('Enter');
	await shot.wait(200);
	shot.expectText('menu-picked', 'delete');
	shot.expectPresent('menu-popup');
	await shot.keys('Escape');
	await shot.wait(300);
	shot.expectAbsent('menu-popup');

	// A press outside closes it.
	await shot.click('menu-trigger');
	await shot.wait(200);
	shot.expectPresent('menu-popup');
	await shot.click('menu-picked');
	await shot.wait(300);
	shot.expectAbsent('menu-popup');

	// A pointer open hands focus back to the trigger on close.
	await shot.click('menu-trigger');
	await shot.wait(200);
	await shot.keys('Escape');
	await shot.wait(300);
	shot.expectFocused('menu-trigger');

	await shot.click('menu-external-open');
	await shot.wait(300);
	shot.expectPresent('menu-external-popup');
	await shot.capture('open-from-outside');
	await shot.keys('Escape');
	await shot.wait(300);
	shot.expectAbsent('menu-external-popup');
}
