import SwiftUI

/// The demo's window colour (`semanticColors.backgroundSolid`): opaque, so glass samples the same thing on both sides.
func backdropColor(dark: Bool) -> Color {
	dark ? Color(red: 0, green: 0, blue: 0) : Color(red: 1, green: 1, blue: 1)
}

/// Same header height and padding as the demo's `Page`/`ScrollArea`.
let headerHeight: CGFloat = 52

struct DemoPage<Content: View>: View {
	let title: String
	@ViewBuilder var content: Content

	var body: some View {
		ScrollView {
			VStack(alignment: .leading, spacing: 24) {
				content
			}
			.padding(24)
			.padding(.top, headerHeight)
			.frame(maxWidth: .infinity, alignment: .leading)
		}
		.overlay(alignment: .topLeading) {
			Text(title)
				.font(.system(size: 15, weight: .semibold))
				.padding(.leading, 15)
				.frame(height: headerHeight)
		}
	}
}

struct DemoSection<Content: View>: View {
	let title: String
	@ViewBuilder var content: Content

	var body: some View {
		VStack(alignment: .leading, spacing: 10) {
			Text(title)
				.font(.system(size: 11, weight: .semibold))
				.foregroundStyle(.secondary)
			content
		}
	}
}

struct Cell<Content: View>: View {
	let label: String
	@ViewBuilder var content: Content

	var body: some View {
		VStack(alignment: .leading, spacing: 6) {
			content
			Text(label)
				.font(.system(size: 11))
				.foregroundStyle(.tertiary)
		}
	}
}

struct Caption: View {
	let text: String
	init(_ text: String) { self.text = text }
	var body: some View {
		Text(text)
			.font(.system(size: 11))
			.foregroundStyle(.tertiary)
	}
}

/// The demo's `Colourful` block: wide stripes for glass to sample.
struct Stripes: View {
	static let colors: [Color] = [
		Color(red: 1, green: 0.231, blue: 0.188),
		Color(red: 1, green: 0.8, blue: 0),
		Color(red: 0.204, green: 0.78, blue: 0.349),
		Color(red: 0.039, green: 0.518, blue: 1),
		Color(red: 0.749, green: 0.353, blue: 0.949),
	]

	var body: some View {
		GeometryReader { proxy in
			HStack(spacing: 0) {
				ForEach(0..<Int(ceil(proxy.size.width / 36)), id: \.self) { index in
					Stripes.colors[index % Stripes.colors.count].frame(width: 36)
				}
			}
			.frame(width: proxy.size.width, alignment: .leading)
			.clipped()
		}
	}
}

struct StripeBlock<Content: View>: View {
	let height: CGFloat
	var spacing: CGFloat = 24
	@ViewBuilder var content: Content

	var body: some View {
		HStack(spacing: spacing) { content }
			.padding(.horizontal, 24)
			.frame(maxWidth: .infinity)
			.frame(height: height)
			.background(Stripes())
			.clipShape(RoundedRectangle(cornerRadius: 16))
	}
}
