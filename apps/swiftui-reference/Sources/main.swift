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
	var key = "none"
	var hold = false
	var front = false
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
		case "--key": options.key = value(argument)
		case "--hold": options.hold = true
		case "--front": options.front = true
		case "--dump": options.dump = true
		case "--delay": options.delay = Double(value(argument)) ?? 1.8
		default:
			guard options.page.isEmpty, Pages.names.contains(argument) else {
				fatalError("usage: swiftui-reference <\(Pages.names.joined(separator: "|"))> [--scheme light|dark] [--out file.png] [--size WxH] [--scroll pt] [--scroll-inner pt] [--flash] [--focus default|glass] [--click x,y] [--hover x,y] [--flash] [--key none|panel|override] [--front] [--hold] [--dump]")
			}
			options.page = argument
		}
	}
	guard !options.page.isEmpty else { fatalError("page name required") }
	return options
}

/// A window that reports itself key without the app being active; see AGENTS.md for what this does and does not change.
final class OverrideWindow: NSWindow {
	override var isKeyWindow: Bool { true }
	override var isMainWindow: Bool { true }
	override var canBecomeKey: Bool { true }
	override var canBecomeMain: Bool { true }
	override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect { frameRect }
}

/// Never key: macOS sometimes makes a new window of an accessory app key on its own, which would take keystrokes meant for the user's app.
final class PlainWindow: NSWindow {
	override var canBecomeKey: Bool { false }
	override var canBecomeMain: Bool { false }
	override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect { frameRect }
}

/// A non-activating panel can become key while the app stays inactive.
final class KeyPanel: NSPanel {
	override var canBecomeKey: Bool { true }
	override var canBecomeMain: Bool { true }
	override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect { frameRect }
}

func allViews(_ view: NSView) -> [NSView] {
	[view] + view.subviews.flatMap(allViews)
}

if CommandLine.arguments.contains("--screen") {
	let frame = (NSScreen.main ?? NSScreen.screens[0]).frame
	print(Int(frame.width), Int(frame.height))
	exit(0)
}
let options = parse()
let application = NSApplication.shared
application.setActivationPolicy(.accessory)
application.appearance = NSAppearance(named: options.dark ? .darkAqua : .aqua)

let style: NSWindow.StyleMask = [.titled, .fullSizeContentView, .closable, .resizable]
let rect = NSRect(origin: .zero, size: options.size)
let window: NSWindow
switch options.key {
case "override": window = OverrideWindow(contentRect: rect, styleMask: style, backing: .buffered, defer: false)
case "panel": window = KeyPanel(contentRect: rect, styleMask: style.union(.nonactivatingPanel), backing: .buffered, defer: false)
default: window = PlainWindow(contentRect: rect, styleMask: style, backing: .buffered, defer: false)
}
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

let screen = NSScreen.main ?? NSScreen.screens[0]
if options.front || options.click != nil {
	window.setFrameOrigin(NSPoint(x: screen.frame.minX + 120, y: screen.frame.maxY - options.size.height - 120))
} else {
	// A covered window gets no frames: park it behind everything with a strip on the screen's edge showing.
	window.setFrameOrigin(NSPoint(x: screen.frame.maxX - 60, y: screen.frame.maxY - options.size.height - 120))
}
window.orderFrontRegardless()
if !(options.front || options.click != nil) { window.order(.below, relativeTo: 0) }

switch options.key {
case "panel": window.makeKey()
case "override":
	NotificationCenter.default.post(name: NSWindow.didBecomeKeyNotification, object: window)
	NotificationCenter.default.post(name: NSWindow.didBecomeMainNotification, object: window)
default: break
}

/// Whether the window is in the key state the run asked for: it can turn key on its own (the app is never activated here), and a capture of the wrong state is useless.
func keyStateMatches() -> Bool {
	options.key != "none" || !window.isKeyWindow
}

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
	if options.flash { scrollViews().forEach { $0.flashScrollers() } }
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

DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { prepare() }
DispatchQueue.main.asyncAfter(deadline: .now() + options.delay) {
	report()
	if !keyStateMatches() {
		FileHandle.standardError.write(Data("the window became key by itself; not capturing\n".utf8))
		exit(3)
	}
	if let path = options.out {
		if let point = options.click {
			// The pointer has to be over the control before it presses, as a real click's is.
			send(.mouseMoved, at: point)
			DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
				// Menu tracking runs its own loop: the timer has to be in the common modes to fire inside it.
				let timer = Timer(timeInterval: 2.0, repeats: false) { _ in
					if ownWindowIDs().count < 2 {
						FileHandle.standardError.write(Data("the click opened nothing\n".utf8))
						exit(4)
					}
					capture(to: path)
					exit(0)
				}
				RunLoop.main.add(timer, forMode: .common)
				send(.leftMouseDown, at: point)
			}
		} else {
			capture(to: path)
			if !options.hold { exit(0) }
		}
	}
}
application.run()
