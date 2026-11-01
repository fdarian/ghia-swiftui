import {
	Button,
	Icon,
	ScrollArea,
	type ScrollAreaControl,
	Text,
	Toolbar,
	ToolbarRow,
} from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal, For } from 'solid-js';
import { Frame, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const lines = (count: number, label: string) =>
	Array.from({ length: count }, (_, index) => `${label} ${index + 1}`);

function Lines(props: { count: number; label: string }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<For each={lines(props.count, props.label)}>
				{(line) => (
					<div
						style={{
							paddingInline: 16,
							paddingBlock: 8,
							borderBottomWidth: 1,
							borderStyle: 'solid',
							borderColor: semanticColors.borderTertiary,
						}}
					>
						<Text>{line}</Text>
					</div>
				)}
			</For>
		</div>
	);
}

function ChatLog() {
	const [messages, setMessages] = createSignal(lines(14, 'Message'));
	let control: ScrollAreaControl | undefined;
	const [suspended, setSuspended] = createSignal(0);
	return (
		<>
			<Row gap={8}>
				<Button
					testId="chat-append"
					size="small"
					onClick={() =>
						setMessages((current) => [
							...current,
							`Message ${current.length + 1}`,
						])
					}
				>
					Append a message
				</Button>
				<Button
					testId="chat-force"
					size="small"
					onClick={() => control?.forceScrollToBottom()}
				>
					forceScrollToBottom
				</Button>
				<Button
					testId="chat-suspend"
					size="small"
					onClick={() => {
						control?.suspendAutoFollow();
						setSuspended((depth) => depth + 1);
					}}
				>
					suspendAutoFollow
				</Button>
				<Button
					testId="chat-resume"
					size="small"
					onClick={() => {
						control?.resumeAutoFollow();
						setSuspended((depth) => Math.max(0, depth - 1));
					}}
				>
					resumeAutoFollow
				</Button>
				<Text variant="small" color="tertiary" testId="chat-suspended">
					{`suspended ${suspended()}`}
				</Text>
			</Row>
			<Frame height={260} testId="chat-frame">
				<ScrollArea
					testId="chat"
					title="Chat"
					subtitle={`${messages().length} messages`}
					autoScrollToBottom
					showScrollToBottomButton
					scrollControlRef={(next) => {
						control = next;
					}}
				>
					<div style={{ paddingBottom: 8 }}>
						<For each={messages()}>
							{(message) => (
								<div style={{ paddingInline: 16, paddingBlock: 6 }}>
									<Text>{message}</Text>
								</div>
							)}
						</For>
					</div>
				</ScrollArea>
			</Frame>
		</>
	);
}

export function ScrollAreaDemo() {
	return (
		<Page
			title="ScrollArea"
			subtitle="Scrollbars between the toolbar and the footer, fade edges, auto-follow"
		>
			<Section title="Toolbar from title, subtitle and actions; a footer">
				<Frame height={280}>
					<ScrollArea
						testId="basic"
						title="History"
						subtitle="12 pending · 240 total"
						actions={
							<Button variant="accent">
								<Icon name="refresh-cw" />
								Sync
							</Button>
						}
						footer={
							<Toolbar position="bottom">
								<ToolbarRow>
									<Text variant="small" color="secondary">
										60 items
									</Text>
								</ToolbarRow>
							</Toolbar>
						}
					>
						<Lines count={60} label="Row" />
					</ScrollArea>
				</Frame>
			</Section>
			<Section title="fadeEdges: the edge with more behind it dissolves">
				<Frame height={200}>
					<ScrollArea testId="fade" fadeEdges>
						<Lines count={30} label="Faded row" />
					</ScrollArea>
				</Frame>
			</Section>
			<Section title='scrollbars="both": a wide, tall content'>
				<Frame height={200}>
					<ScrollArea testId="both" scrollbars="both">
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								width: 900,
							}}
						>
							<For each={lines(30, 'Wide row')}>
								{(line) => (
									<div style={{ paddingInline: 16, paddingBlock: 8 }}>
										<Text
											style={{ whiteSpace: 'nowrap' }}
										>{`${line} — a long line that needs the horizontal bar to read to its end`}</Text>
									</div>
								)}
							</For>
						</div>
					</ScrollArea>
				</Frame>
			</Section>
			<Section title="autoScrollToBottom, showScrollToBottomButton and the control">
				<ChatLog />
			</Section>
		</Page>
	);
}

export async function scrollAreaScenario(shot: Shot) {
	// The track exists once the content overflows, and the wheel scrolls it.
	shot.expectPresent('basic-y-track');
	await shot.wheel('basic', 200);
	const scrolled = shot.scrollMetrics('basic-viewport');
	if (scrolled.scrollTop <= 0) throw new Error('the wheel did not scroll');
	await shot.capture('scrolled');

	await shot.scrollTo('fade-viewport', 120);
	await shot.capture('fade-middle');

	// Auto-follow: a message appended while at the bottom keeps the bottom.
	await shot.reveal('chat-frame');
	await shot.reveal('chat-append');
	await shot.scrollTo('chat-viewport', 10_000);
	await shot.click('chat-append');
	await shot.wait(200);
	const following = shot.scrollMetrics('chat-viewport');
	if (
		following.scrollHeight - following.scrollTop - following.clientHeight >
		5
	) {
		throw new Error('the chat did not follow the new message');
	}

	// Scrolled up, it stays put and offers the button.
	await shot.scrollTo('chat-viewport', 0);
	await shot.click('chat-append');
	await shot.wait(200);
	if (shot.scrollMetrics('chat-viewport').scrollTop !== 0) {
		throw new Error('the chat followed while scrolled away from the bottom');
	}
	await shot.capture('chat-scrolled-up');
	await shot.click('chat-scroll-to-bottom');
	await shot.wait(900);
	const back = shot.scrollMetrics('chat-viewport');
	if (back.scrollHeight - back.scrollTop - back.clientHeight > 5) {
		throw new Error('the button did not scroll to the bottom');
	}

	// A suspended follow holds the position until it resumes.
	await shot.click('chat-suspend');
	await shot.click('chat-append');
	await shot.wait(200);
	const held = shot.scrollMetrics('chat-viewport');
	if (held.scrollHeight - held.scrollTop - held.clientHeight < 5) {
		throw new Error('a suspended follow still followed');
	}
	await shot.click('chat-resume');
	await shot.click('chat-force');
	await shot.wait(200);
}
