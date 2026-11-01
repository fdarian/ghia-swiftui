import {
	Button,
	Icon,
	Text,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const sides = ['top', 'bottom', 'left', 'right'] as const;

export function TooltipDemo() {
	const [opens, setOpens] = createSignal(0);
	return (
		<Page title="Tooltip">
			<Section title="Pinned open, by side (open)">
				<Row gap={190}>
					<For each={sides}>
						{(side) => (
							<Cell label={side}>
								<Tooltip open>
									<TooltipTrigger>
										<Button testId={`tooltip-pinned-${side}`} variant="muted">
											{side}
										</Button>
									</TooltipTrigger>
									<TooltipContent
										testId={`tooltip-pinned-${side}-content`}
										side={side}
									>
										Tooltip on the {side}
									</TooltipContent>
								</Tooltip>
							</Cell>
						)}
					</For>
				</Row>
			</Section>
			<Section title="Pinned open with a shortcut">
				<Row gap={120}>
					<Cell label="label and shortcut">
						<Tooltip open>
							<TooltipTrigger>
								<Button iconOnly variant="glass" aria-label="Toggle sidebar">
									<Icon name="inbox" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" shortcut={['⌘', 'B']}>
								Toggle sidebar
							</TooltipContent>
						</Tooltip>
					</Cell>
					<Cell label="shortcut only">
						<Tooltip open>
							<TooltipTrigger>
								<Button iconOnly variant="glass" aria-label="Search">
									<Icon name="search" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" shortcut={['⌘', 'K']} />
						</Tooltip>
					</Cell>
				</Row>
			</Section>
			<Section title="Hover and focus (under a provider: 150ms delay, 300ms close delay)">
				<TooltipProvider delay={150} closeDelay={300}>
					<Row gap={12}>
						<Tooltip>
							<TooltipTrigger>
								<Button testId="tooltip-first" variant="filled">
									First
								</Button>
							</TooltipTrigger>
							<TooltipContent testId="tooltip-first-content" side="bottom">
								First button
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger>
								<Button testId="tooltip-second" variant="filled">
									Second
								</Button>
							</TooltipTrigger>
							<TooltipContent testId="tooltip-second-content" side="bottom">
								Second button
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger delay={0} closeDelay={0}>
								<Button testId="tooltip-instant" variant="filled">
									Instant
								</Button>
							</TooltipTrigger>
							<TooltipContent testId="tooltip-instant-content" side="bottom">
								No delay of its own
							</TooltipContent>
						</Tooltip>
					</Row>
				</TooltipProvider>
			</Section>
			<Section title="Default delay (600ms), no provider">
				<Row>
					<Tooltip>
						<TooltipTrigger>
							<Button testId="tooltip-slow" variant="filled">
								Rest here
							</Button>
						</TooltipTrigger>
						<TooltipContent testId="tooltip-slow-content" side="right">
							Opens after 600ms
						</TooltipContent>
					</Tooltip>
				</Row>
			</Section>
			<Section title="Controlled">
				<Row>
					<Cell label="open from outside">
						<Tooltip open={opens() % 2 === 1}>
							<TooltipTrigger>
								<Button testId="tooltip-controlled" variant="muted">
									Controlled
								</Button>
							</TooltipTrigger>
							<TooltipContent testId="tooltip-controlled-content" side="bottom">
								Forced open
							</TooltipContent>
						</Tooltip>
					</Cell>
					<Cell label="toggle">
						<Button
							testId="tooltip-toggle"
							variant="filled"
							onClick={() => setOpens(opens() + 1)}
						>
							Toggle
						</Button>
					</Cell>
					<Cell label="toggles">
						<Text testId="tooltip-toggles">{`${opens()}`}</Text>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function tooltipScenario(shot: Shot) {
	// `hover` itself lets 300ms pass, so the 600ms delay is half spent.
	await shot.hover('tooltip-slow');
	shot.expectAbsent('tooltip-slow-content');
	await shot.wait(500);
	shot.expectPresent('tooltip-slow-content');
	await shot.capture('hover-slow');
	await shot.leave();
	await shot.wait(400);
	shot.expectAbsent('tooltip-slow-content');

	await shot.hover('tooltip-first');
	await shot.wait(250);
	shot.expectPresent('tooltip-first-content');
	await shot.capture('hover-first');
	// The pointer moving on to the neighbour opens it at once: the provider's skip delay.
	await shot.hover('tooltip-second');
	await shot.hover('tooltip-second');
	shot.expectPresent('tooltip-second-content');
	await shot.leave();
	await shot.wait(150);
	// Still within the 300ms close delay.
	shot.expectPresent('tooltip-second-content');
	await shot.wait(700);
	shot.expectAbsent('tooltip-second-content');

	await shot.focus('tooltip-instant');
	await shot.wait(100);
	shot.expectPresent('tooltip-instant-content');
	await shot.keys('Escape');
	await shot.wait(400);
	shot.expectAbsent('tooltip-instant-content');

	shot.expectAbsent('tooltip-controlled-content');
	await shot.click('tooltip-toggle');
	await shot.wait(300);
	shot.expectPresent('tooltip-controlled-content');
	shot.expectText('tooltip-toggles', '1');
	await shot.click('tooltip-toggle');
	shot.expectText('tooltip-toggles', '2');
	await shot.wait(1000);
	shot.expectAbsent('tooltip-controlled-content');
}
