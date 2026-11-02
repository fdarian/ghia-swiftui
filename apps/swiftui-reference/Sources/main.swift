import AppKit
import SwiftUI

struct Options {
	var page = ""
	var dark = false
	var out: String?
	var size = CGSize(width: 760, height: 640)
	var scroll: CGFloat = 0
	var click: CGPoint?
	var hover: CGPoint?
	var flash = false
	var focus: String?
	var scrollInner: CGFloat = 0
	var hold = false
	var front = false
	var allowFront = false
	var dump = false
	var delay = 1.8
}

func point(_ text: String) -> CGPoint {
	let parts = text.split(separator: ",").compactMap { Double($0) }
	guard parts.count == 2 else { fatalError("expected x,y") }
	return CGPoint(x: parts[0], y: parts[1])
}

func parse() -> Options {
	var options = Options()
	var arguments = Array(CommandLine.arguments.dropFirst())
	func value(_ flag: String) -> String {
		guard !arguments.isEmpty else { fatalError("\(flag) needs a value") }
		return arguments.removeFirst()
	}
	while !arguments.isEmpty {
		let argument = arguments.removeFirst()
		switch argument {
		case "--scheme": options.dark = value(argument) == "dark"
		case "--out": options.out = value(argument)
		case "--size":
			let parts = value(argument).split(separator: "x").compactMap { Double($0) }
			guard parts.count == 2 else { fatalError("--size needs WxH") }
			options.size = CGSize(width: parts[0], height: parts[1])
		case "--scroll": options.scroll = CGFloat(Double(value(argument)) ?? 0)
		case "--click": options.click = point(value(argument))
		case "--hover": options.hover = point(value(argument))
		case "--flash": options.flash = true
		case "--focus": options.focus = value(argument)
		case "--scroll-inner": options.scrollInner = CGFloat(Double(value(argument)) ?? 0)
		case "--hold": options.hold = true
		case "--front": options.front = true
		case "--allow-front": options.allowFront = true
		case "--dump": options.dump = true
		case "--delay": options.delay = Double(value(argument)) ?? 1.8
		default:
			guard options.page.isEmpty, Pages.names.contains(argument) else {
				fatalError("usage: swiftui-reference <\(Pages.names.joined(separator: "|"))> [--scheme light|dark] [--out file.png] [--size WxH] [--scroll pt] [--scroll-inner pt] [--flash] [--focus default|glass] [--click x,y] [--hover x,y] [--front] [--allow-front] [--hold] [--dump]")
			}
			options.page = argument
		}
	}
	guard !options.page.isEmpty else { fatalError("page name required") }
	if (options.front || options.click != nil) && !options.allowFront {
		FileHandle.standardError.write(Data("--front and --click put the window, and the menu a click opens, in front of everything for seconds: this covers the user's work. Run it only when the user asked for it, with --allow-front.\n".utf8))
		exit(2)
	}
	return options
}

/// Never key or main: a key window is how an app gets keystrokes, and nothing here may take them from the user's app.
final class ReferenceWindow: NSWindow {
	override var canBecomeKey: Bool { false }
	override var canBecomeMain: Bool { false }
	override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect { frameRect }
}

/// The reference app must never come to the front: every way of asking for it is a no-op.
final class ReferenceApplication: NSApplication {
	override func activate(ignoringOtherApps flag: Bool) {}
	override func activate() {}
	override func yieldActivation(to application: NSRunningApplication) {}
}

func allViews(_ view: NSView) -> [NSView] {
	[view] + view.subviews.flatMap(allViews)
}

let options = parse()
let application = ReferenceApplication.shared
guard application.setActivationPolicy(.accessory) else { fatalError("could not become an accessory app") }
application.appearance = NSAppearance(named: options.dark ? .darkAqua : .aqua)

let style: NSWindow.StyleMask = [.titled, .fullSizeContentView, .closable, .resizable]
let rect = NSRect(origin: .zero, size: options.size)
let window = ReferenceWindow(contentRect: rect, styleMask: style, backing: .buffered, defer: false)
window.isReleasedWhenClosed = false
let windowed = Pages.windowed.contains(options.page)
if !windowed {
	window.titlebarAppearsTransparent = true
	window.titleVisibility = .hidden
}
window.backgroundColor = NSColor(options.dark ? .black : .white)
window.isOpaque = true
window.hasShadow = false
if !windowed {
	for button: NSWindow.ButtonType in [.closeButton, .miniaturizeButton, .zoomButton] {
		window.standardWindowButton(button)?.isHidden = true
	}
}

requestedFocus = options.focus
let root = Pages.view(options.page)
	.background(windowed ? nil : backdropColor(dark: options.dark))
	.ignoresSafeArea()
let controller = NSHostingController(rootView: root)
controller.sizingOptions = []
if windowed { controller.sceneBridgingOptions = .all }
window.contentViewController = controller
window.setContentSize(options.size)

/// How much of a parked window shows: a covered window gets no frames, so some pixels stay on a display, and the part off every display still draws.
let parkStrip: CGFloat = 8

func overlap(_ a: NSRect, _ b: NSRect) -> CGFloat {
	let intersection = a.intersection(b)
	return intersection.isNull ? 0 : intersection.width * intersection.height
}

/// The screen the user is working on: the one holding the frontmost window of the frontmost app, or, when that app has no window (Finder with none open), the one holding the mouse pointer (read only, no input). `NSScreen.main` is not that for an app that is not active: it answers with its own idea of main, wherever the user is.
func userScreen() -> NSScreen {
	guard let pid = NSWorkspace.shared.frontmostApplication?.processIdentifier else { fatalError("no frontmost app") }
	let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
	let primaryHeight = NSScreen.screens[0].frame.height
	for info in windows where info[kCGWindowOwnerPID as String] as? Int32 == pid && info[kCGWindowLayer as String] as? Int == 0 {
		guard let bounds = info[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
		// CGWindow bounds have their origin at the primary display's top-left, y down; AppKit's at its bottom-left, y up.
		let box = NSRect(x: bounds["X"]!, y: primaryHeight - bounds["Y"]! - bounds["Height"]!, width: bounds["Width"]!, height: bounds["Height"]!)
		if let screen = NSScreen.screens.max(by: { overlap(box, $0.frame) < overlap(box, $1.frame) }), overlap(box, screen.frame) > 0 { return screen }
	}
	let pointer = NSEvent.mouseLocation
	guard let screen = NSScreen.screens.first(where: { $0.frame.contains(pointer) }) else { fatalError("the mouse pointer \(pointer) is on no display") }
	return screen
}

/// Where a window of `size` is parked: a `parkStrip` edge of it on a screen that is not the user's, unless there is only one. Of the strips on that screen's four edges the one with the least of the window on any screen wins, so the rest hangs off where no screen is.
func parkedOrigin(size: CGSize) -> NSPoint {
	let user = userScreen()
	let targets = NSScreen.screens.count == 1 ? NSScreen.screens : NSScreen.screens.filter { $0 != user }
	var best: (origin: NSPoint, cost: CGFloat)?
	for target in targets {
		let area = target.frame
		let alongX = max(area.minX, min(area.minX + 120, area.maxX - size.width))
		let alongY = min(area.maxY, max(area.maxY - 120, area.minY + size.height)) - size.height
		let candidates = [
			NSPoint(x: area.maxX - parkStrip, y: alongY),
			NSPoint(x: area.minX + parkStrip - size.width, y: alongY),
			NSPoint(x: alongX, y: area.minY + parkStrip - size.height),
			NSPoint(x: alongX, y: area.maxY - parkStrip),
		]
		for origin in candidates {
			let box = NSRect(origin: origin, size: size)
			if NSScreen.screens.count > 1 && overlap(box, user.frame) > 0 { continue }
			let cost = NSScreen.screens.reduce(0) { $0 + overlap(box, $1.frame) }
			if best == nil || cost < best!.cost { best = (origin, cost) }
		}
	}
	guard let best else { fatalError("no edge of any display leaves the user's display clear") }
	return best.origin
}

if options.front || options.click != nil {
	let screen = userScreen()
	window.setFrameOrigin(NSPoint(x: screen.frame.minX + 120, y: screen.frame.maxY - options.size.height - 120))
} else {
	window.setFrameOrigin(parkedOrigin(size: window.frame.size))
}
window.orderFrontRegardless()
if !(options.front || options.click != nil) { window.order(.below, relativeTo: 0) }

func report() {
	let occlusion = window.occlusionState.contains(.visible)
	FileHandle.standardError.write(Data("window \(window.windowNumber) key=\(window.isKeyWindow) main=\(window.isMainWindow) appActive=\(application.isActive) visible=\(occlusion) scale=\(window.backingScaleFactor)\n".utf8))
}

func scrollViews() -> [NSScrollView] {
	guard let content = window.contentView else { return [] }
	return allViews(content).compactMap { $0 as? NSScrollView }
}

func prepare() {
	if options.dump, let content = window.contentView {
		for view in allViews(content) where String(describing: type(of: view)).contains("KeyViewProxy") {
			let frame = view.convert(view.bounds, to: nil)
			print("control x=\(Int(frame.minX)) y=\(Int(window.contentLayoutRect.height - frame.maxY)) w=\(Int(frame.width)) h=\(Int(frame.height))")
		}
	}
	window.acceptsMouseMovedEvents = true
	if let point = options.hover { send(.mouseMoved, at: point) }
	if options.scroll != 0, let scroller = scrollViews().first, let document = scroller.documentView {
		document.scroll(NSPoint(x: 0, y: options.scroll))
		scroller.reflectScrolledClipView(scroller.contentView)
	}
	if options.scrollInner != 0, let scroller = scrollViews().last, let document = scroller.documentView {
		document.scroll(NSPoint(x: 0, y: options.scrollInner))
		scroller.reflectScrolledClipView(scroller.contentView)
	}
}

let coreGraphics = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_NOW)
typealias CreateImage = @convention(c) (CGRect, UInt32, UInt32, UInt32) -> Unmanaged<CGImage>?
typealias CreateImageFromArray = @convention(c) (CGRect, CFArray, UInt32) -> Unmanaged<CGImage>?
// Obsoleted in the macOS 15 SDK, still exported: the demo's capture calls it the same way.
let createImage = unsafeBitCast(dlsym(coreGraphics, "CGWindowListCreateImage"), to: CreateImage.self)
let createImageFromArray = unsafeBitCast(dlsym(coreGraphics, "CGWindowListCreateImageFromArray"), to: CreateImageFromArray.self)

func ownWindowIDs() -> [CGWindowID] {
	let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
	return info.compactMap { entry in
		guard entry[kCGWindowOwnerPID as String] as? Int32 == getpid() else { return nil }
		return entry[kCGWindowNumber as String] as? CGWindowID
	}
}

func capture(to path: String) {
	let image: CGImage?
	if options.click != nil {
		let ids = ownWindowIDs()
		FileHandle.standardError.write(Data("windows \(ids)\n".utf8))
		// The array holds the raw window numbers as pointers, with no retain callbacks.
		var pointers: [UnsafeRawPointer?] = ids.map { UnsafeRawPointer(bitPattern: UInt($0)) }
		let array = CFArrayCreate(nil, &pointers, pointers.count, nil)!
		image = createImageFromArray(.null, array, 1 | 8)?.takeRetainedValue()
	} else {
		image = createImage(.null, 8, CGWindowID(window.windowNumber), 1 | 8)?.takeRetainedValue()
	}
	guard let image else { fatalError("CGWindowListCreateImage returned null") }
	let data = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
	guard let data else { fatalError("png encode failed") }
	try! data.write(to: URL(fileURLWithPath: path))
	print("captured \(path) (\(image.width)x\(image.height))")
}

/// A mouse event for the window alone: `sendEvent` hands it to this app's views and posts nothing to the OS.
func send(_ type: NSEvent.EventType, at point: CGPoint) {
	let location = NSPoint(x: point.x, y: window.contentLayoutRect.height - point.y)
	let event = NSEvent.mouseEvent(with: type, location: location, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime, windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: 1)
	guard let event else { fatalError("could not make a mouse event") }
	window.sendEvent(event)
}

/// Presses on the point. A press that opens a menu blocks in menu tracking, so `captured` runs from a timer in the common run-loop modes; a press that returns with no menu open was not taken (SwiftUI sometimes misses the first one) and is tried again.
func press(at point: CGPoint, attempt: Int, captured: @escaping () -> Void) {
	// The pointer has to be over the control before it presses, as a real click's is.
	send(.mouseMoved, at: point)
	DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
		let timer = Timer(timeInterval: 2.0, repeats: false) { _ in captured() }
		RunLoop.main.add(timer, forMode: .common)
		send(.leftMouseDown, at: point)
		guard ownWindowIDs().count < 2 else { return }
		timer.invalidate()
		send(.leftMouseUp, at: point)
		guard attempt < 5 else {
			FileHandle.standardError.write(Data("the click opened nothing\n".utf8))
			exit(4)
		}
		press(at: point, attempt: attempt + 1, captured: captured)
	}
}

DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { prepare() }
if options.flash {
	// Overlay scrollers fade out about a second after they show.
	DispatchQueue.main.asyncAfter(deadline: .now() + options.delay - 0.3) { scrollViews().forEach { $0.flashScrollers() } }
}
DispatchQueue.main.asyncAfter(deadline: .now() + options.delay) {
	report()
	if window.isKeyWindow || application.isActive {
		FileHandle.standardError.write(Data("the app became active by itself; not capturing\n".utf8))
		exit(3)
	}
	if let path = options.out {
		if let point = options.click {
			press(at: point, attempt: 1) {
				capture(to: path)
				exit(0)
			}
		} else {
			capture(to: path)
			if !options.hold { exit(0) }
		}
	}
}
// Not `application.run()`: its finishLaunching makes the app frontmost, taking the user's focus. Windows draw and events sent by hand work without it.
RunLoop.main.run()
