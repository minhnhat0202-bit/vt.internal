// Mèo robot trên màn hình Mac. Cửa sổ trong suốt, không viền, nổi trên mọi cửa sổ, phủ màn hình chính trừ thanh menu và Dock,
// bên trong là WKWebView nạp desktop/meo.html (cùng mèo với Bản tin TV). Chuột xuyên qua cửa sổ, trừ lúc trỏ vào mèo
// (trang báo vùng mèo chiếm qua messageHandlers.meo): bấm vào mèo thì hiện menu app thường dùng.
// Cấu hình: ~/Library/Application Support/MeoRobot/apps.json (lần đầu chép từ desktop/apps.json trong app). Biểu tượng 🐱 trên thanh menu
// có cùng menu và nút Thoát. Dựng app: desktop/build.sh
import Cocoa
import WebKit

let fm = FileManager.default
let supportDir = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("MeoRobot")
let configURL = supportDir.appendingPathComponent("apps.json")

func loadConfig() -> [String: Any] {
    if !fm.fileExists(atPath: configURL.path) {
        try? fm.createDirectory(at: supportDir, withIntermediateDirectories: true)
        if let d = Bundle.main.url(forResource: "apps", withExtension: "json", subdirectory: "desktop") { try? fm.copyItem(at: d, to: configURL) }
    }
    if let data = try? Data(contentsOf: configURL), let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] { return j }
    return [:]
}

final class PetWindow: NSWindow { override var canBecomeKey: Bool { true } }
final class PetView: WKWebView { override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true } }   // cú bấm đầu tiên cũng tới mèo

final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, NSMenuDelegate {
    var window: PetWindow!
    var web: PetView!
    var status: NSStatusItem!
    var catRect = NSRect.zero          // vùng mèo đang chiếm, toạ độ màn hình (gốc dưới trái)
    var timer: Timer?
    var hoverOn = false
    var tick = 0
    var lastShelves = ""
    var dragging = false               // đang kéo mèo: giữ cửa sổ nhận chuột dù chuột vượt ra ngoài vùng mèo

    func screenFrame() -> NSRect { NSScreen.screens.first?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 800) }

    func applicationDidFinishLaunching(_ note: Notification) {
        NSApp.setActivationPolicy(.accessory)
        let cfg = loadConfig()
        window = PetWindow(contentRect: screenFrame(), styleMask: .borderless, backing: .buffered, defer: false)
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        window.ignoresMouseEvents = true
        window.isReleasedWhenClosed = false

        let uc = WKUserContentController()
        uc.add(self, name: "meo")
        var js = "window.MEO_CFG = {};"
        let pass: [String: Any] = ["size": cfg["size"] ?? 0.48, "napMinutes": cfg["napMinutes"] ?? 5, "awakeMinutes": cfg["awakeMinutes"] ?? 5, "talkSeconds": cfg["talkSeconds"] ?? 30]
        if let d = try? JSONSerialization.data(withJSONObject: pass), let s = String(data: d, encoding: .utf8) { js = "window.MEO_CFG = \(s);" }
        uc.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let wc = WKWebViewConfiguration()
        wc.userContentController = uc
        web = PetView(frame: window.contentView!.bounds, configuration: wc)
        web.autoresizingMask = [.width, .height]
        web.setValue(false, forKey: "drawsBackground")      // nền trang trong suốt
        if #available(macOS 12.0, *) { web.underPageBackgroundColor = .clear }
        window.contentView!.addSubview(web)
        let res = Bundle.main.resourceURL!
        web.loadFileURL(res.appendingPathComponent("desktop/meo.html"), allowingReadAccessTo: res)
        window.orderFrontRegardless()

        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        status.button?.title = "🐱"
        let menu = NSMenu()
        menu.delegate = self
        menu.autoenablesItems = false
        status.menu = menu

        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let s = self else { return }
            s.track(); s.tick += 1; if s.tick % 3 == 0 { s.scanWindows() }
        }
        NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            guard let s = self else { return }
            s.window.setFrame(s.screenFrame(), display: true)
        }
    }

    // Chuột trỏ vào mèo thì cửa sổ nhận chuột (để bấm được), ra ngoài thì lại xuyên qua.
    func track() {
        let p = NSEvent.mouseLocation
        let inside = dragging || (!catRect.isEmpty && catRect.insetBy(dx: -6, dy: -6).contains(p))
        if window.ignoresMouseEvents == inside { window.ignoresMouseEvents = !inside }
        if inside != hoverOn { hoverOn = inside; web.evaluateJavaScript("robotHover(\(inside))", completionHandler: nil) }   // mèo ngồi lại / đi tiếp
    }

    func userContentController(_ ucc: WKUserContentController, didReceive msg: WKScriptMessage) {
        guard let b = msg.body as? [String: Any], let t = b["t"] as? String else { return }
        if t == "rect", let x = b["x"] as? Double, let y = b["y"] as? Double, let w = b["w"] as? Double, let h = b["h"] as? Double {
            let f = window.frame
            catRect = NSRect(x: f.minX + x, y: f.maxY - y - h, width: w, height: h)
        } else if t == "drag" {
            dragging = (b["on"] as? Bool) ?? false
        } else if t == "menu" {
            let m = NSMenu()
            m.autoenablesItems = false
            rebuild(m)
            m.popUp(positioning: nil, at: NSEvent.mouseLocation, in: nil)
            DispatchQueue.main.async { NSApp.deactivate() }     // trả tiêu điểm về app đang dùng
        }
    }

    // Nóc cửa sổ cho mèo trèo: cửa sổ thường (layer 0) đang hiện, không phải của app này, đủ to. Duyệt từ trước ra sau, mỗi nóc trừ đi
    // phần bị cửa sổ phía trước che (vùng mèo đứng cao 70 điểm trên mép), cạnh trái/phải cũng xét bị che. Toạ độ trang: gốc mép trên vùng
    // hiển thị (dưới thanh menu), y hướng xuống. Chỉ gửi sang trang khi danh sách đổi. Không cần quyền gì (chỉ tên cửa sổ mới cần Screen Recording).
    func scanWindows() {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]],
              let scr = NSScreen.screens.first else { return }
        let vf = scr.visibleFrame, full = scr.frame, offY = full.maxY - vf.maxY, offX = vf.minX - full.minX
        let me = ProcessInfo.processInfo.processIdentifier
        var rects: [(id: Int, r: CGRect)] = []
        for w in list {
            guard (w["kCGWindowLayer"] as? Int) == 0, (w["kCGWindowOwnerPID"] as? Int32) != me, ((w["kCGWindowAlpha"] as? Double) ?? 1) > 0.3,
                  let bd = w["kCGWindowBounds"] as? [String: Any], let b = CGRect(dictionaryRepresentation: bd as CFDictionary),
                  b.width >= 180, b.height >= 80 else { continue }
            rects.append((w["kCGWindowNumber"] as? Int ?? 0, CGRect(x: b.minX - offX, y: b.minY - offY, width: b.width, height: b.height)))
        }
        var out: [[String: Any]] = []
        let catH: CGFloat = 70
        for (i, w) in rects.enumerated() {
            let top = w.r.minY
            if top < 70 || top > vf.height - 40 { continue }
            var segs: [(CGFloat, CGFloat)] = [(max(0, w.r.minX), min(vf.width, w.r.maxX))]
            let band = CGRect(x: w.r.minX, y: top - catH, width: w.r.width, height: catH)
            let lwall = CGRect(x: w.r.minX - 60, y: top, width: 60, height: w.r.height), rwall = CGRect(x: w.r.maxX, y: top, width: 60, height: w.r.height)
            var lclear = true, rclear = true
            for f in rects[0..<i] {
                if f.r.intersects(band) {
                    segs = segs.flatMap { s -> [(CGFloat, CGFloat)] in
                        if f.r.maxX <= s.0 || f.r.minX >= s.1 { return [s] }
                        var o: [(CGFloat, CGFloat)] = []
                        if f.r.minX > s.0 { o.append((s.0, f.r.minX)) }
                        if f.r.maxX < s.1 { o.append((f.r.maxX, s.1)) }
                        return o
                    }
                }
                if f.r.intersects(lwall) { lclear = false }
                if f.r.intersects(rwall) { rclear = false }
            }
            for s in segs where s.1 - s.0 >= 150 {
                out.append(["wid": w.id, "x1": s.0.rounded(), "x2": s.1.rounded(), "top": top.rounded(), "wl": w.r.minX.rounded(), "wr": w.r.maxX.rounded(),
                            "bottom": w.r.maxY.rounded(), "lclear": lclear, "rclear": rclear])
            }
            if out.count >= 16 { break }
        }
        if let d = try? JSONSerialization.data(withJSONObject: out), let s = String(data: d, encoding: .utf8), s != lastShelves {
            lastShelves = s
            web.evaluateJavaScript("robotShelves(\(s))", completionHandler: nil)
        }
    }

    // Menu: các mục trong apps.json (đọc lại mỗi lần mở, sửa file là thấy ngay) + lệnh cho mèo + Thoát.
    func menuNeedsUpdate(_ menu: NSMenu) { rebuild(menu) }
    func rebuild(_ menu: NSMenu) {
        menu.removeAllItems()
        let cfg = loadConfig()
        for raw in (cfg["apps"] as? [Any]) ?? [] {
            if let s = raw as? String, s == "-" { menu.addItem(.separator()); continue }
            guard let d = raw as? [String: Any] else { continue }
            let target = resolve(d)
            let name = d["name"] as? String ?? d["app"] as? String ?? d["url"] as? String ?? d["path"] as? String ?? "?"
            let item = NSMenuItem(title: target == nil ? name + " (không tìm thấy)" : name, action: #selector(openItem(_:)), keyEquivalent: "")
            item.target = self
            item.representedObject = target
            item.isEnabled = target != nil
            item.image = icon(for: d, target: target)
            menu.addItem(item)
        }
        if !menu.items.isEmpty { menu.addItem(.separator()) }
        add(menu, "Nói gì đi", #selector(sayNow))
        add(menu, "Đi ngủ", #selector(napNow))
        add(menu, "Dậy đi", #selector(wakeNow))
        menu.addItem(.separator())
        add(menu, "Sửa danh sách app…", #selector(editConfig))
        add(menu, "Thoát mèo", #selector(quit))
    }
    func add(_ menu: NSMenu, _ title: String, _ sel: Selector) {
        let i = NSMenuItem(title: title, action: sel, keyEquivalent: ""); i.target = self; menu.addItem(i)
    }
    // Mục menu → URL: "url" mở bằng trình duyệt; "path" là file/thư mục; "app" là tên trong /Applications, bundle id hoặc đường dẫn .app.
    func resolve(_ d: [String: Any]) -> URL? {
        if let u = d["url"] as? String, let url = URL(string: u) { return url }
        if let p = d["path"] as? String {
            let path = (p as NSString).expandingTildeInPath
            return fm.fileExists(atPath: path) ? URL(fileURLWithPath: path) : nil
        }
        if let a = d["app"] as? String {
            if a.hasPrefix("/") || a.hasPrefix("~") {
                let path = (a as NSString).expandingTildeInPath
                return fm.fileExists(atPath: path) ? URL(fileURLWithPath: path) : nil
            }
            if a.contains("."), !a.hasSuffix(".app"), let u = NSWorkspace.shared.urlForApplication(withBundleIdentifier: a) { return u }
            let name = a.hasSuffix(".app") ? a : a + ".app"
            for dir in ["/Applications", "/System/Applications", "/System/Applications/Utilities", NSHomeDirectory() + "/Applications"] {
                let path = dir + "/" + name
                if fm.fileExists(atPath: path) { return URL(fileURLWithPath: path) }
            }
        }
        return nil
    }
    func icon(for d: [String: Any], target: URL?) -> NSImage? {
        var img: NSImage?
        if let t = target, t.isFileURL { img = NSWorkspace.shared.icon(forFile: t.path) }
        else if d["url"] != nil { img = NSImage(systemSymbolName: "globe", accessibilityDescription: nil) }
        else { img = NSImage(systemSymbolName: "questionmark.app", accessibilityDescription: nil) }
        img?.size = NSSize(width: 18, height: 18)
        return img
    }

    @objc func openItem(_ sender: NSMenuItem) {
        guard let url = sender.representedObject as? URL else { return }
        if url.isFileURL && url.pathExtension == "app" { NSWorkspace.shared.openApplication(at: url, configuration: NSWorkspace.OpenConfiguration()) }
        else { NSWorkspace.shared.open(url) }
    }
    @objc func sayNow() { web.evaluateJavaScript("robotGo()", completionHandler: nil) }
    @objc func napNow() { web.evaluateJavaScript("robotNap()", completionHandler: nil) }
    @objc func wakeNow() { web.evaluateJavaScript("robotWake()", completionHandler: nil) }
    @objc func editConfig() { _ = loadConfig(); NSWorkspace.shared.open(configURL) }
    @objc func quit() { NSApp.terminate(nil) }
}

let app = NSApplication.shared
let delegate = App()
app.delegate = delegate
app.run()
