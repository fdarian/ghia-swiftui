import SwiftUI

/// Which field the page focuses once it appears (`--focus`), so one run shows one focused field.
nonisolated(unsafe) var requestedFocus: String?

private let sizes: [(String, ControlSize)] = [("small", .small), ("medium", .regular), ("large", .large)]

// MARK: button

private struct StyleRow<S: PrimitiveButtonStyle>: View {
	let label: String
	let style: S
	let note: String
	var tint: Color? = nil

	var body: some View {
		HStack(spacing: 16) {
			Text(label)
				.font(.system(size: 11))
				.foregroundStyle(.tertiary)
				.frame(width: 90, alignment: .leading)
			ForEach(sizes, id: \.0) { size in
				Button(size.0) {}
					.controlSize(size.1)
					.tint(tint)
			}
			Caption(note)
		}
		.buttonStyle(style)
	}
}

struct ButtonPage: View {
	var body: some View {
		DemoPage(title: "Button") {
			DemoSection(title: "Variant by size") {
				VStack(alignment: .leading, spacing: 16) {
					StyleRow(label: "accent", style: .borderedProminent, note: ".borderedProminent")
					StyleRow(label: "destructive", style: .borderedProminent, note: ".borderedProminent, .tint(.red)", tint: .red)
					StyleRow(label: "glassAccent", style: .glassProminent, note: ".glassProminent")
					StyleRow(label: "filled", style: .bordered, note: ".bordered")
					StyleRow(label: "transparent", style: .borderless, note: ".borderless")
					StyleRow(label: "glass", style: .glass, note: ".glass")
				}
			}
			DemoSection(title: "Icons") {
				HStack(alignment: .top, spacing: 16) {
					Cell(label: "leading icon") {
						Button { } label: { Label("New item", systemImage: "plus") }
							.buttonStyle(.borderedProminent)
					}
					ForEach(sizes, id: \.0) { size in
						Cell(label: "iconOnly \(size.0)") {
							Button { } label: { Image(systemName: "trash") }
								.buttonStyle(.bordered)
								.controlSize(size.1)
								.accessibilityLabel("Delete")
						}
					}
				}
			}
			DemoSection(title: "Radius") {
				HStack(alignment: .top, spacing: 16) {
					ForEach(sizes, id: \.0) { size in
						Cell(label: "rounded \(size.0)") {
							Button("Rounded") {}
								.buttonStyle(.bordered)
								.buttonBorderShape(.roundedRectangle)
								.controlSize(size.1)
						}
					}
					Cell(label: "full (default)") {
						Button("Full") {}.buttonStyle(.bordered)
					}
				}
			}
			DemoSection(title: "State") {
				VStack(alignment: .leading, spacing: 12) {
					stateRow(.bordered, "filled")
					stateRow(.borderless, "transparent")
					stateRow(.glass, "glass")
					stateRow(.glassProminent, "glassAccent")
				}
			}
		}
	}

	private func stateRow<S: PrimitiveButtonStyle>(_ style: S, _ variant: String) -> some View {
		HStack(alignment: .top, spacing: 16) {
			Cell(label: "\(variant) rest") { Button("Button") {}.buttonStyle(style) }
			Cell(label: "disabled") { Button("Button") {}.buttonStyle(style).disabled(true) }
		}
	}
}

// MARK: select

private let sources = ["Apple Music", "Spotify", "Tidal", "YouTube Music"]

struct SourcePicker: View {
	@State private var value = "Spotify"
	var body: some View {
		Picker("", selection: $value) {
			ForEach(sources, id: \.self) { Text($0).tag($0) }
		}
		.labelsHidden()
		.pickerStyle(.menu)
	}
}

private struct ZonePicker: View {
	@State private var value = "UTC-05:00"
	var body: some View {
		Picker("", selection: $value) {
			ForEach(0..<8, id: \.self) { index in
				let label = "UTC\(index < 12 ? "-" : "+")\(String(format: "%02d", abs(index - 12))):00"
				Text(label).tag(label)
			}
		}
		.labelsHidden()
		.pickerStyle(.menu)
		.controlSize(.small)
	}
}

private struct PlaceholderPicker: View {
	@State private var value: String? = nil
	var body: some View {
		Picker("", selection: $value) {
			Text("Choose a player").tag(String?.none)
			ForEach(sources, id: \.self) { Text($0).tag(Optional($0)) }
		}
		.labelsHidden()
		.pickerStyle(.menu)
	}
}

struct SelectPage: View {
	var body: some View {
		DemoPage(title: "Select") {
			DemoSection(title: "Aligned item past the window's top edge (8 items, last selected)") {
				ZonePicker()
			}
			DemoSection(title: "Trigger variant by size (value: Spotify)") {
				VStack(alignment: .leading, spacing: 12) {
					variantRow("default") { $0 }
					variantRow("transparent") { $0.menuStyle(.borderlessButton) }
					variantRow("glass") { $0.buttonStyle(.glass) }
				}
			}
			DemoSection(title: "Controlled, open count, placeholder, disabled") {
				HStack(alignment: .top, spacing: 24) {
					Cell(label: "controlled") { SourcePicker() }
					Cell(label: "no value: placeholder") { PlaceholderPicker() }
					Cell(label: "disabled") { SourcePicker().disabled(true) }
				}
			}
		}
	}

	private func variantRow<V: View>(_ name: String, _ transform: @escaping (SourcePicker) -> V) -> some View {
		HStack(alignment: .top, spacing: 24) {
			ForEach(sizes, id: \.0) { size in
				Cell(label: "\(name) \(size.0)") {
					transform(SourcePicker()).controlSize(size.1)
				}
			}
		}
	}
}

// MARK: menu

struct MenuPage: View {
	var body: some View {
		DemoPage(title: "Menu") {
			DemoSection(title: "Dropdown from a button") {
				HStack(alignment: .top, spacing: 24) {
					Cell(label: "opens below, left edges aligned") {
						Menu("Actions") {
							Button("Show in Apple Music", systemImage: "arrow.up.forward.square") {}
							Button("Rename", systemImage: "star") {}.disabled(true)
							Button("Delete Entry", systemImage: "trash") {}
						}
						.menuStyle(.button)
						.buttonStyle(.bordered)
						.fixedSize()
					}
					Cell(label: "picked") { Text("none") }
					Cell(label: "opened") { Text("0") }
				}
			}
			DemoSection(title: "Opened from outside (controlled), opens above, right edges aligned") {
				HStack(alignment: .top, spacing: 24) {
					Cell(label: "trigger button") {
						Menu("More") {
							Button("First") {}
							Button("Second") {}
						}
						.menuStyle(.button)
						.buttonStyle(.bordered)
						.fixedSize()
					}
					Cell(label: "opens it") { Button("Open") {}.buttonStyle(.bordered) }
				}
			}
			DemoSection(title: "Glass trigger") {
				Menu("Actions") {
					Button("Show in Apple Music") {}
					Button("Delete Entry") {}
				}
				.menuStyle(.button)
				.buttonStyle(.glass)
				.fixedSize()
			}
		}
	}
}

// MARK: input

private struct FieldCell: View {
	let label: String
	var text: String = ""
	var width: CGFloat = 180
	var size: ControlSize = .regular
	var disabled = false
	var focusID: String? = nil
	@FocusState private var focused: Bool

	var body: some View {
		Cell(label: label) {
			TextField("Placeholder", text: .constant(text))
				.textFieldStyle(.roundedBorder)
				.controlSize(size)
				.frame(width: width)
				.disabled(disabled)
				.focused($focused)
				.onAppear {
					if focusID != nil && focusID == requestedFocus { DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { focused = true } }
				}
		}
	}
}

private struct GlassField: View {
	let label: String
	var text: String = ""
	var focus = false
	var disabled = false
	@FocusState private var focused: Bool

	var body: some View {
		Cell(label: label) {
			HStack(spacing: 6) {
				Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
				TextField("Search", text: .constant(text))
					.textFieldStyle(.plain)
					.focused($focused)
			}
			.padding(.horizontal, 10)
			.padding(.vertical, 6)
			.frame(width: 200)
			.glassEffect(.regular.interactive(), in: .capsule)
			.disabled(disabled)
			.onAppear {
				if focus && requestedFocus == "glass" { DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { focused = true } }
			}
		}
	}
}

struct InputPage: View {
	var body: some View {
		DemoPage(title: "Input") {
			DemoSection(title: "Variant by size") {
				VStack(alignment: .leading, spacing: 12) {
					HStack(alignment: .top, spacing: 16) {
						ForEach(sizes, id: \.0) { size in FieldCell(label: "default \(size.0)", size: size.1) }
					}
				}
			}
			DemoSection(title: "State") {
				HStack(alignment: .top, spacing: 16) {
					FieldCell(label: "with value", text: "Hello, world")
					FieldCell(label: "focused (default)", focusID: "default")
					FieldCell(label: "disabled", text: "Read only", disabled: true)
				}
			}
			DemoSection(title: "Glass") {
				HStack(alignment: .top, spacing: 16) {
					GlassField(label: "glass")
					GlassField(label: "focused", focus: true)
					GlassField(label: "with value", text: "Invoices")
				}
			}
			DemoSection(title: ".searchable (in the window's toolbar)") {
				Caption("see the toolbar page")
			}
		}
	}
}

// MARK: sidebar

private struct Destination: Hashable {
	let id: String
	let title: String
	let icon: String
	var subtitle: String? = nil
	var count: Int? = nil
}

private let destinations = [
	Destination(id: "history", title: "History", icon: "clock", count: 12),
	Destination(id: "log", title: "Sync Log", icon: "scroll", subtitle: "Last run 2m ago"),
	Destination(id: "account", title: "Integration", icon: "person.crop.circle"),
	Destination(id: "settings", title: "Settings", icon: "gearshape"),
]

struct SidebarPage: View {
	@State private var selected: String? = "history"
	@State private var visibility = NavigationSplitViewVisibility.all

	var body: some View {
		NavigationSplitView(columnVisibility: $visibility) {
			List(selection: $selected) {
				ForEach(destinations, id: \.id) { destination in
					Label {
						VStack(alignment: .leading, spacing: 1) {
							Text(destination.title)
							if let subtitle = destination.subtitle {
								Text(subtitle).font(.system(size: 11)).foregroundStyle(.secondary)
							}
						}
					} icon: {
						Image(systemName: destination.icon)
					}
					.badge(destination.count ?? 0)
				}
			}
			.navigationSplitViewColumnWidth(min: 180, ideal: 260, max: 300)
			.safeAreaInset(edge: .bottom) {
				Label("Settings", systemImage: "gearshape")
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.horizontal, 12)
					.padding(.vertical, 8)
			}
		} detail: {
			Text("Selected: \(destinations.first { $0.id == selected }?.title ?? "none")")
				.foregroundStyle(.secondary)
		}
		.toolbar {
			ToolbarItem(placement: .primaryAction) {
				Button { } label: { Image(systemName: "plus") }
			}
		}
	}
}

// MARK: toolbar

private let toolbarStripes: [Color] = [
	Color(red: 0.357, green: 0.553, blue: 0.937),
	Color(red: 0.69, green: 0.361, blue: 0.961),
	Color(red: 0.961, green: 0.435, blue: 0.545),
	Color(red: 0.961, green: 0.639, blue: 0.361),
	Color(red: 0.31, green: 0.753, blue: 0.553),
	Color(red: 0.357, green: 0.753, blue: 0.922),
]

struct ToolbarPage: View {
	@State private var search = ""

	var body: some View {
		NavigationStack {
			ScrollView {
				VStack(spacing: 0) {
					ForEach(0..<24, id: \.self) { index in
						toolbarStripes[index % toolbarStripes.count].frame(height: 26)
					}
				}
			}
			.scrollEdgeEffectStyle(.soft, for: .top)
			.navigationTitle("Inbox")
			.navigationSubtitle("3 unread messages")
			.toolbar {
				ToolbarItem(placement: .primaryAction) {
					Button { } label: { Label("Compose", systemImage: "plus") }
				}
			}
			.searchable(text: $search, prompt: "Search")
		}
	}
}

// MARK: tooltip

struct TooltipPage: View {
	var body: some View {
		DemoPage(title: "Tooltip") {
			DemoSection(title: "Pinned open, by side (open)") {
				HStack(alignment: .top, spacing: 60) {
					ForEach(["top", "bottom", "left", "right"], id: \.self) { side in
						Cell(label: side) {
							Button(side) {}.buttonStyle(.bordered).help("Tooltip on the \(side)")
						}
					}
				}
			}
			DemoSection(title: "Pinned open with a shortcut") {
				HStack(alignment: .top, spacing: 60) {
					Cell(label: "label and shortcut") {
						Button { } label: { Image(systemName: "sidebar.left") }
							.buttonStyle(.glass)
							.help("Toggle sidebar")
					}
				}
			}
		}
	}
}

// MARK: checkbox

struct CheckboxPage: View {
	@State private var off = false
	@State private var on = true
	@State private var mixed = false

	var body: some View {
		DemoPage(title: "Checkbox") {
			DemoSection(title: "State") {
				HStack(alignment: .top, spacing: 24) {
					Cell(label: "unchecked") { Toggle("Unchecked", isOn: $off).labelsHidden() }
					Cell(label: "checked") { Toggle("Checked", isOn: $on).labelsHidden() }
					Cell(label: "indeterminate") { MixedCheckbox() }
					Cell(label: "disabled") { Toggle("Disabled", isOn: $off).labelsHidden().disabled(true) }
					Cell(label: "disabled, checked") { Toggle("Disabled checked", isOn: $on).labelsHidden().disabled(true) }
				}
			}
			DemoSection(title: "With a label") {
				HStack(alignment: .top, spacing: 24) {
					Toggle("Notify me", isOn: $on)
					Toggle("Notify me", isOn: $off)
				}
			}
		}
		.toggleStyle(.checkbox)
	}
}

private struct MixedCheckbox: View {
	var body: some View {
		MixedCheckboxRepresentable().frame(width: 18, height: 18)
	}
}

private struct MixedCheckboxRepresentable: NSViewRepresentable {
	func makeNSView(context: Context) -> NSButton {
		let button = NSButton(checkboxWithTitle: "", target: nil, action: nil)
		button.allowsMixedState = true
		button.state = .mixed
		return button
	}
	func updateNSView(_ view: NSButton, context: Context) {}
}

// MARK: radio

struct RadioPage: View {
	@State private var theme = "light"
	private let themes = [("system", "Auto"), ("light", "Light"), ("dark", "Dark")]

	var body: some View {
		DemoPage(title: "RadioGroup") {
			DemoSection(title: "Orientation (each item in a Label, click the text)") {
				HStack(alignment: .top, spacing: 48) {
					Cell(label: "vertical (default)") {
						Picker("", selection: $theme) {
							ForEach(themes, id: \.0) { Text($0.1).tag($0.0) }
						}
						.pickerStyle(.radioGroup)
						.labelsHidden()
					}
					Cell(label: "horizontal, shares the same value") {
						Picker("", selection: $theme) {
							ForEach(themes, id: \.0) { Text($0.1).tag($0.0) }
						}
						.pickerStyle(.radioGroup)
						.horizontalRadioGroupLayout()
						.labelsHidden()
					}
					Cell(label: "selected value") { Text(theme) }
				}
			}
			DemoSection(title: "State") {
				HStack(alignment: .top, spacing: 48) {
					Cell(label: "disabled") {
						Picker("", selection: $theme) {
							ForEach(themes, id: \.0) { Text($0.1).tag($0.0) }
						}
						.pickerStyle(.radioGroup)
						.labelsHidden()
						.disabled(true)
					}
				}
			}
		}
	}
}

// MARK: list

private struct Track: Hashable {
	let id: String
	let title: String
	let artist: String
	let album: String
}

private let tracks = [
	Track(id: "one", title: "Paranoid Android", artist: "Radiohead", album: "OK Computer"),
	Track(id: "two", title: "Teardrop", artist: "Massive Attack", album: "Mezzanine"),
	Track(id: "three", title: "Roads", artist: "Portishead", album: "Dummy"),
	Track(id: "four", title: "Glory Box", artist: "Portishead", album: "Dummy"),
	Track(id: "five", title: "Hyperballad", artist: "Björk", album: "Post"),
	Track(id: "six", title: "Windowlicker", artist: "Aphex Twin", album: "Windowlicker"),
]

struct ListPage: View {
	@State private var selected: String? = "two"

	var body: some View {
		DemoPage(title: "List") {
			DemoSection(title: "Selectable") {
				List(selection: $selected) {
					ForEach(tracks, id: \.id) { track in
						HStack {
							VStack(alignment: .leading, spacing: 2) {
								Text(track.title)
								Text("\(track.artist) · \(track.album)").font(.system(size: 11)).foregroundStyle(.secondary)
							}
							Spacer()
							Text("Synced").font(.system(size: 11)).foregroundStyle(.green)
							Text("3:42").font(.system(size: 11)).foregroundStyle(.tertiary)
						}
						.tag(track.id)
					}
				}
				.frame(height: 360)
				.clipShape(RoundedRectangle(cornerRadius: 12))
				.overlay(RoundedRectangle(cornerRadius: 12).stroke(.quaternary))
			}
		}
	}
}

// MARK: scrollbar

struct ScrollbarPage: View {
	var body: some View {
		DemoPage(title: "ScrollArea") {
			DemoSection(title: "Toolbar from title, subtitle and actions; a footer") {
				ScrollView {
					VStack(spacing: 0) {
						ForEach(1...14, id: \.self) { index in
							VStack(spacing: 0) {
								Text("Message \(index)")
									.padding(.horizontal, 16)
									.padding(.vertical, 8)
									.frame(maxWidth: .infinity, alignment: .leading)
								Divider()
							}
						}
					}
				}
				.frame(height: 280)
				.clipShape(RoundedRectangle(cornerRadius: 12))
				.overlay(RoundedRectangle(cornerRadius: 12).stroke(.quaternary))
			}
		}
	}
}

// MARK: glass

private let statusVariants: [(String, String, Color)] = [
	("loading", "circle.dotted", .secondary),
	("neutral", "circle.fill", .secondary),
	("success", "checkmark.circle.fill", .green),
	("warning", "exclamationmark.triangle.fill", .orange),
	("error", "xmark.octagon.fill", .red),
]

private struct StatusPill: View {
	let name: String
	let symbol: String
	let color: Color
	var text: String? = nil

	var body: some View {
		HStack(spacing: 5) {
			Image(systemName: symbol).foregroundStyle(color)
			Text(text ?? name)
		}
		.font(.system(size: 12))
		.padding(.horizontal, 10)
		.padding(.vertical, 4)
		.glassEffect(.regular, in: .capsule)
	}
}

/// The glass-panel demo's `Backdrop`: `repeating-linear-gradient(45deg, #ff6b6b 0 14px, #ffd93d 14px 28px, #4dabf7 28px 42px, #51cf66 42px 56px)`.
private struct DiagonalStripes: View {
	private let colors = [
		Color(red: 1, green: 0.42, blue: 0.42),
		Color(red: 1, green: 0.851, blue: 0.239),
		Color(red: 0.302, green: 0.671, blue: 0.969),
		Color(red: 0.318, green: 0.812, blue: 0.4),
	]

	var body: some View {
		Canvas { context, size in
			let length = (size.width + size.height) * sin(.pi / 4)
			context.translateBy(x: size.width / 2, y: size.height / 2)
			context.rotate(by: .radians(-.pi / 4))
			let count = Int(ceil(length / 14)) + 1
			for index in 0..<count {
				let x = -length / 2 + CGFloat(index) * 14
				context.fill(Path(CGRect(x: x, y: -length, width: 14, height: length * 2)), with: .color(colors[index % 4]))
			}
		}
	}
}

private struct GlassBackdrop<Content: View>: View {
	@ViewBuilder var content: Content
	var body: some View {
		ZStack { DiagonalStripes(); content }
			.frame(width: 420, height: 150)
			.clipShape(RoundedRectangle(cornerRadius: 12))
	}
}

struct GlassPage: View {
	var body: some View {
		DemoPage(title: "GlassPanel") {
			DemoSection(title: "Floating over content") {
				VStack(alignment: .leading, spacing: 16) {
					Cell(label: "action bar of glass buttons") {
						GlassBackdrop {
							GlassEffectContainer {
								HStack(spacing: 8) {
									Button { } label: { Image(systemName: "star") }.buttonStyle(.glass)
									Button { } label: { Image(systemName: "arrow.down.circle") }.buttonStyle(.glass)
									Divider().frame(height: 16)
									Button("Share") {}.buttonStyle(.glass)
									Button("Publish") {}.buttonStyle(.glassProminent)
								}
								.padding(6)
								.glassEffect(.regular, in: .capsule)
							}
						}
					}
					Cell(label: "with a status pill and text") {
						GlassBackdrop {
							HStack(spacing: 10) {
								StatusPill(name: "success", symbol: "circle.fill", color: .green, text: "Connected")
								Text("3 files changed").font(.system(size: 13, weight: .semibold))
							}
							.padding(10)
							.glassEffect(.regular, in: .capsule)
						}
					}
				}
			}
			DemoSection(title: "On the page background (no content to blur)") {
				GlassEffectContainer {
					HStack(spacing: 4) {
						Button("Back") {}.buttonStyle(.glass)
						Button("Forward") {}.buttonStyle(.glass)
					}
					.padding(4)
					.glassEffect(.regular, in: .capsule)
				}
				.fixedSize()
			}
		}
	}
}

struct LiquidPage: View {
	var body: some View {
		DemoPage(title: "Liquid glass") {
			DemoSection(title: "GlassPanel: regular, clear, tinted") {
				StripeBlock(height: 160) {
					Text("Regular").font(.system(size: 13, weight: .semibold)).padding(16).glassEffect(.regular, in: .rect(cornerRadius: 16))
					Text("Clear").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white).padding(16).glassEffect(.clear, in: .rect(cornerRadius: 16))
					Text("Tinted").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white).padding(16).glassEffect(.regular.tint(.accentColor.opacity(0.5)), in: .rect(cornerRadius: 16))
				}
			}
			DemoSection(title: "Glass controls over colour") {
				StripeBlock(height: 120) {
					Button("Glass") {}.buttonStyle(.glass)
					Button { } label: { Image(systemName: "star") }.buttonStyle(.glass).controlSize(.large)
					Button("Glass accent") {}.buttonStyle(.glassProminent)
					StatusPill(name: "success", symbol: "circle.fill", color: .green, text: "Connected")
					SourcePicker().buttonStyle(.glass)
				}
			}
			DemoSection(title: "Tints") {
				StripeBlock(height: 120) {
					Text("Red").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white).padding(16).glassEffect(.regular.tint(.red.opacity(0.5)), in: .rect(cornerRadius: 16))
					Text("Green").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white).padding(16).glassEffect(.regular.tint(.green.opacity(0.5)), in: .rect(cornerRadius: 16))
					Text("Interactive").font(.system(size: 13, weight: .semibold)).padding(16).glassEffect(.regular.interactive(), in: .rect(cornerRadius: 16))
				}
			}
		}
	}
}

struct StatusPage: View {
	var body: some View {
		DemoPage(title: "Status") {
			DemoSection(title: "Variant (loading is the default)") {
				HStack(alignment: .top, spacing: 16) {
					ForEach(statusVariants, id: \.0) { variant in
						Cell(label: variant.0) {
							HStack(spacing: 5) {
								Image(systemName: variant.1).foregroundStyle(variant.2)
								Text(variant.0)
							}
							.font(.system(size: 12))
						}
					}
				}
			}
			DemoSection(title: "Over content (glass material)") {
				HStack(spacing: 12) {
					ForEach(statusVariants, id: \.0) { StatusPill(name: $0.0, symbol: $0.1, color: $0.2) }
				}
				.padding(20)
				.frame(maxWidth: .infinity, alignment: .leading)
				.background(LinearGradient(colors: [Color(red: 1, green: 0.478, blue: 0.349), Color(red: 1, green: 0.702, blue: 0.278), Color(red: 0.31, green: 0.765, blue: 0.969)], startPoint: .leading, endPoint: .trailing))
				.clipShape(RoundedRectangle(cornerRadius: 12))
			}
		}
	}
}

// MARK: registry

enum Pages {
	static let names = ["button", "select", "menu", "input", "sidebar", "toolbar", "tooltip", "checkbox", "radio", "list", "scrollbar", "glass", "liquid", "status"]

	/// Pages that are a whole window rather than content in the demo's page frame.
	static let windowed: Set<String> = ["sidebar", "toolbar"]

	static func view(_ name: String) -> AnyView {
		switch name {
		case "button": return AnyView(ButtonPage())
		case "select": return AnyView(SelectPage())
		case "menu": return AnyView(MenuPage())
		case "input": return AnyView(InputPage())
		case "sidebar": return AnyView(SidebarPage())
		case "toolbar": return AnyView(ToolbarPage())
		case "tooltip": return AnyView(TooltipPage())
		case "checkbox": return AnyView(CheckboxPage())
		case "radio": return AnyView(RadioPage())
		case "list": return AnyView(ListPage())
		case "scrollbar": return AnyView(ScrollbarPage())
		case "glass": return AnyView(GlassPage())
		case "liquid": return AnyView(LiquidPage())
		case "status": return AnyView(StatusPage())
		default: fatalError("unknown page \(name); one of \(names.joined(separator: ", "))")
		}
	}
}
