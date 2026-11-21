import AppKit
import CoreServices
import Foundation
import Security
import ServiceManagement
import UserNotifications

private let agentPlist = "com.iskra.transcription.agent.plist"
private let agentLabel = "com.iskra.transcription.agent"
private let appName = "Искра — расшифровка.app"
private let moduleName = "TranscriptionModule"
private let appURLScheme = "iskra-transcription"

private enum Companion {
    static var appSupport: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Iskra", isDirectory: true)
    }
    static var module: URL { appSupport.appendingPathComponent("transcription-module", isDirectory: true) }
    static let service = SMAppService.agent(plistName: agentPlist)
    static let installedURL = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Applications", isDirectory: true)
        .appendingPathComponent(appName, isDirectory: true)

    static func isInstalled(_ url: URL) -> Bool {
        let current = url.resolvingSymlinksInPath()
        let installed = installedURL.resolvingSymlinksInPath()
        return current.path == installed.path
            || current.deletingLastPathComponent().path == "/Applications"
    }

    /// Older copies of this app (same bundle id, same or lower version) left in
    /// /Applications or ~/Applications go to the Trash, so Launchpad shows one
    /// app. Running copies are left alone; Downloads is not touched (macOS would
    /// ask the teacher for folder access). Called only from the installed copy.
    static func trashOtherCopies() {
        let current = Bundle.main.bundleURL.resolvingSymlinksInPath().path
        let id = Bundle.main.bundleIdentifier ?? "ru.iskra.transcription"
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        let folders = [URL(fileURLWithPath: "/Applications", isDirectory: true), installedURL.deletingLastPathComponent()]
        let running = Set(NSRunningApplication.runningApplications(withBundleIdentifier: id)
            .compactMap { $0.bundleURL?.resolvingSymlinksInPath().path })
        var old: [URL] = []
        for folder in folders {
            let items = (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? []
            for url in items where url.pathExtension == "app" {
                let path = url.resolvingSymlinksInPath().path
                guard path != current, !running.contains(path), let bundle = Bundle(url: url),
                      bundle.bundleIdentifier == id else { continue }
                let other = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
                if other.compare(version, options: .numeric) != .orderedDescending { old.append(url) }
            }
        }
        guard !old.isEmpty else { return }
        NSWorkspace.shared.recycle(old) { trashed, _ in
            for url in trashed.keys { print("Iskra transcription: old copy moved to Trash: \(url.path)") }
        }
    }

    static func installResources() throws {
        try FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
        let marker = module.appendingPathComponent(".launcher-install-version")
        let installVersion = Bundle.main.object(forInfoDictionaryKey: "IskraInstallerVersion") as? String ?? "1"
        if (try? String(contentsOf: marker, encoding: .utf8)) == installVersion { return }
        let bundled = Bundle.main.resourceURL!.appendingPathComponent(moduleName, isDirectory: true)
        guard FileManager.default.fileExists(atPath: bundled.appendingPathComponent("start.command").path) else {
            throw NSError(domain: "IskraTranscription", code: 1, userInfo: [NSLocalizedDescriptionKey: "В установщике не найдены файлы модуля."])
        }
        if FileManager.default.fileExists(atPath: module.path) { try FileManager.default.removeItem(at: module) }
        try FileManager.default.createDirectory(at: module, withIntermediateDirectories: true)
        let files = try FileManager.default.contentsOfDirectory(at: bundled, includingPropertiesForKeys: nil)
        for file in files where file.pathExtension == "py" || file.pathExtension == "swift" || ["start.command", "README.md"].contains(file.lastPathComponent) {
            try FileManager.default.copyItem(at: file, to: module.appendingPathComponent(file.lastPathComponent))
        }
        try Data(installVersion.utf8).write(to: marker, options: .atomic)
    }

    static func register() throws {
        guard isInstalled(Bundle.main.bundleURL) else {
            throw failure("Откройте установленную копию «Искра · Расшифровка» из папки «Программы».")
        }
        try installResources()
        // A missing Background Task Management record may be reported as
        // .notFound even though the agent plist is present in the app.
        let status = service.status
        if status == .notRegistered || status == .notFound {
            do { try service.register() }
            catch where service.status == .requiresApproval { return }
        }
    }

    static func start() throws {
        guard service.status == .enabled else {
            throw failure("macOS не зарегистрировала обработчик. Переустановите приложение и откройте его из папки «Программы».")
        }
        try launchctl(["kickstart", "gui/\(getuid())/\(agentLabel)"])
    }

    static func failure(_ message: String) -> NSError {
        NSError(domain: "IskraTranscription", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    static func stop() throws {
        guard service.status == .enabled else { return }
        try launchctl(["kill", "SIGTERM", "gui/\(getuid())/\(agentLabel)"])
    }

    static func launchctl(_ args: [String]) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        process.arguments = args
        let errors = Pipe()
        process.standardError = errors
        try process.run(); process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            let message = String(data: errors.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
            throw NSError(domain: "IskraTranscription", code: Int(process.terminationStatus), userInfo: [NSLocalizedDescriptionKey: message?.isEmpty == false ? message! : "Не удалось запустить фоновую службу Искры."])
        }
    }

    static func isRunning() async -> Bool {
        let url = URL(string: "http://127.0.0.1:18764/version")!
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 1)
        request.setValue("https://iskra-study.ru", forHTTPHeaderField: "Origin")
        request.setValue("transcription-v1", forHTTPHeaderField: "X-Iskra-Module")
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return false }
        return (body["version"] as? String)?.isEmpty == false
    }

}

/// Обновление самого приложения, как у обычных программ на Mac: раз в несколько
/// часов смотрим манифест на сайте Искры, качаем подписанный DMG и меняем
/// установленную копию на месте. Ставим только сборку с тем же bundle id и той же
/// командой разработчика, что у работающей копии; без подписи (локальная
/// сборка) автообновление выключено.
private enum Updater {
    static let site = URL(string: "https://iskra-study.ru")!
    static let manifestURL = site.appendingPathComponent("downloads/transcription-mac-latest.json")
    static let bundleID = "ru.iskra.transcription"
    static let checkInterval: TimeInterval = 4 * 3600
    static let lastCheckKey = "IskraLastUpdateCheck"

    struct Manifest: Decodable { let version: String; let url: String }
    enum Outcome { case current(String), installed(String) }

    static var currentVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }

    static func isNewer(_ candidate: String, than current: String) -> Bool {
        candidate.compare(current, options: .numeric) == .orderedDescending
    }

    static func failure(_ message: String) -> NSError {
        NSError(domain: "IskraTranscriptionUpdate", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    static func teamID(of url: URL) -> String? {
        var code: SecStaticCode?
        guard SecStaticCodeCreateWithPath(url as CFURL, [], &code) == errSecSuccess, let code else { return nil }
        var info: CFDictionary?
        guard SecCodeCopySigningInformation(code, SecCSFlags(rawValue: kSecCSSigningInformation), &info) == errSecSuccess,
              let dict = info as? [String: Any] else { return nil }
        return dict[kSecCodeInfoTeamIdentifier as String] as? String
    }

    /// Подпись Developer ID той же команды и тот же bundle id, вложенный код тоже.
    static func verify(_ app: URL, team: String) throws {
        var code: SecStaticCode?
        var requirement: SecRequirement?
        let text = "anchor apple generic and identifier \"\(bundleID)\" and certificate leaf[subject.OU] = \"\(team)\""
        guard SecStaticCodeCreateWithPath(app as CFURL, [], &code) == errSecSuccess, let code,
              SecRequirementCreateWithString(text as CFString, [], &requirement) == errSecSuccess, let requirement
        else { throw failure("Не удалось проверить подпись обновления.") }
        let flags = SecCSFlags(rawValue: kSecCSCheckAllArchitectures | kSecCSStrictValidate | kSecCSCheckNestedCode)
        guard SecStaticCodeCheckValidity(code, flags, requirement) == errSecSuccess else {
            throw failure("Подпись обновления не совпала. Обновление не установлено.")
        }
    }

    static func run(_ tool: String, _ args: [String]) throws -> Data {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: tool)
        process.arguments = args
        let output = Pipe()
        process.standardOutput = output
        process.standardError = FileHandle.nullDevice
        try process.run()
        let data = output.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else { throw failure("Не удалось открыть образ обновления.") }
        return data
    }

    /// nil — обновлять нечего (или автообновление недоступно для этой копии).
    static func available() async throws -> Manifest? {
        guard teamID(of: Bundle.main.bundleURL) != nil else { return nil }
        let request = URLRequest(url: manifestURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        let manifest = try JSONDecoder().decode(Manifest.self, from: data)
        return isNewer(manifest.version, than: currentVersion) ? manifest : nil
    }

    /// Скачать, проверить и поставить поверх работающей копии. Работающие
    /// процессы (окно и фоновая служба) держат старые файлы до перезапуска.
    static func install(_ manifest: Manifest) async throws {
        let target = Bundle.main.bundleURL
        guard let team = teamID(of: target) else { throw failure("Эта копия не подписана, обновите её вручную.") }
        guard let url = URL(string: manifest.url, relativeTo: site)?.absoluteURL,
              url.scheme == "https", url.host == site.host else { throw failure("Неверный адрес обновления.") }
        let (downloaded, response) = try await URLSession.shared.download(from: url)
        defer { try? FileManager.default.removeItem(at: downloaded) }
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw failure("Не удалось скачать обновление.") }
        try await Task.detached(priority: .utility) {
            try replace(target, fromImage: downloaded, version: manifest.version, team: team)
        }.value
    }

    private static func replace(_ target: URL, fromImage image: URL, version: String, team: String) throws {
        let fm = FileManager.default
        let mount = fm.temporaryDirectory.appendingPathComponent("iskra-update-\(UUID().uuidString)", isDirectory: true)
        try fm.createDirectory(at: mount, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: mount) }
        _ = try run("/usr/bin/hdiutil", ["attach", "-nobrowse", "-readonly", "-noautoopen", "-noverify",
                                         "-mountpoint", mount.path, image.path])
        defer { _ = try? run("/usr/bin/hdiutil", ["detach", mount.path, "-force"]) }
        let apps = try fm.contentsOfDirectory(at: mount, includingPropertiesForKeys: nil).filter {
            $0.pathExtension == "app" && Bundle(url: $0)?.bundleIdentifier == bundleID
        }
        guard apps.count == 1, let app = apps.first else { throw failure("В образе обновления нет приложения Искры.") }
        let found = Bundle(url: app)?.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        guard found == version, isNewer(found, than: currentVersion) else { throw failure("В образе другая версия приложения.") }
        try verify(app, team: team)

        let folder = target.deletingLastPathComponent()
        let lockURL = Companion.appSupport.appendingPathComponent(".update.lock")
        try fm.createDirectory(at: Companion.appSupport, withIntermediateDirectories: true)
        let lock = open(lockURL.path, O_CREAT | O_WRONLY | O_CLOEXEC | O_NOFOLLOW, 0o600)
        guard lock >= 0, flock(lock, LOCK_EX | LOCK_NB) == 0 else {
            if lock >= 0 { close(lock) }
            throw failure("Обновление уже устанавливается.")
        }
        defer { close(lock) }
        let staging = folder.appendingPathComponent(".Iskra-transcription-update-\(UUID().uuidString).app", isDirectory: true)
        defer { try? fm.removeItem(at: staging) }
        do { try fm.copyItem(at: app, to: staging) }
        catch { throw failure("Нет доступа к папке «\(folder.lastPathComponent)». Скачайте обновление на сайте Искры.") }
        try verify(staging, team: team)
        _ = try fm.replaceItemAt(target, withItemAt: staging)
        LSRegisterURL(target as CFURL, true)
    }

    /// Новый процесс откроет уже обновлённую копию, когда этот завершится.
    static func relaunch(arguments: [String]) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/sh")
        process.arguments = ["-c", "while kill -0 \"$1\" 2>/dev/null; do sleep 0.2; done; shift; exec /usr/bin/open \"$@\"",
                             "sh", String(getpid()), "-n", Bundle.main.bundleURL.path, "--args"] + arguments
        try? process.run()
    }
}

private func runService() -> Never {
    do {
        let logURL = Companion.appSupport.appendingPathComponent("transcription-service.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            _ = FileManager.default.createFile(atPath: logURL.path, contents: nil, attributes: [.posixPermissions: 0o600])
        }
        let log = try FileHandle(forWritingTo: logURL)
        try log.seekToEnd()
        let resource = Bundle.main.resourceURL!.appendingPathComponent(moduleName)
        setenv("ISKRA_FFMPEG", resource.appendingPathComponent("ffmpeg").path, 1)
        setenv("ISKRA_FRAME_TEXT", Bundle.main.bundleURL.appendingPathComponent("Contents/MacOS/IskraFrameText").path, 1)
        setenv("ISKRA_PACKAGED_MODULE", "1", 1)
        guard dup2(log.fileDescriptor, STDOUT_FILENO) >= 0,
              dup2(log.fileDescriptor, STDERR_FILENO) >= 0 else {
            throw Companion.failure("Не удалось открыть журнал обработчика.")
        }
        // Keep the server itself under launchd, so stop and restart reach it.
        let script = Companion.module.appendingPathComponent("start.command").path
        var args: [UnsafeMutablePointer<CChar>?] = [strdup("/bin/zsh"), strdup(script), nil]
        execv("/bin/zsh", &args)
        throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
    } catch {
        FileHandle.standardError.write(Data("Iskra transcription service: \(error.localizedDescription)\n".utf8))
        exit(1)
    }
}

if CommandLine.arguments.contains("--service") { runService() }

// MARK: - Палитра и элементы окна

private let iskraURL = URL(string: "https://iskra-study.ru/#/teacher")!

private func rgb(_ value: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255,
            blue: CGFloat(value & 0xff) / 255, alpha: alpha)
}

/// Цвет, который сам переключается вместе с темой macOS.
private func themed(_ light: UInt32, _ dark: UInt32, _ lightAlpha: CGFloat = 1, _ darkAlpha: CGFloat = 1) -> NSColor {
    NSColor(name: nil) { appearance in
        appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua ? rgb(dark, darkAlpha) : rgb(light, lightAlpha)
    }
}

/// Цвета Искры (src/index.css: --color-accent, --color-purple-soft, --grad-purple).
private enum Palette {
    static let accent = themed(0x6354CF, 0xA99BF5)
    static let accentText = themed(0x3D33A0, 0xDAD3FB)
    static let soft = themed(0xE7E4FB, 0x7C6CE0, 1, 0.3)
    static let tile = themed(0xFFFFFF, 0x343339)
    static let line = themed(0x000000, 0xFFFFFF, 0.1, 0.1)
    static let track = themed(0x000000, 0xFFFFFF, 0.08, 0.12)
    static let ok = themed(0x1F9D55, 0x34C46A)
    static let err = themed(0xD63B30, 0xFF6A5E)
    static let warn = themed(0xB86E00, 0xF0A43A)
    static let gradient = NSGradient(starting: rgb(0x9180E6), ending: rgb(0x6354CF))!
}

/// Подложка рисуется в draw(), поэтому цвета следуют теме без перекраски слоёв.
private final class Panel: NSView {
    var fill: NSColor?
    var stroke: NSColor?
    var radius: CGFloat
    var gradient: NSGradient?

    init(fill: NSColor? = nil, stroke: NSColor? = nil, radius: CGFloat = 10, gradient: NSGradient? = nil) {
        self.fill = fill; self.stroke = stroke; self.radius = radius; self.gradient = gradient
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
    }
    required init?(coder: NSCoder) { fatalError("not used") }

    override func draw(_ dirtyRect: NSRect) {
        let path = NSBezierPath(roundedRect: bounds.insetBy(dx: 0.25, dy: 0.25), xRadius: radius, yRadius: radius)
        if let gradient { gradient.draw(in: path, angle: -45) } else if let fill { fill.setFill(); path.fill() }
        if let stroke { stroke.setStroke(); path.lineWidth = 0.5; path.stroke() }
    }
}

/// Полоса прогресса; без доли — бегущий отрезок (без анимации при «Уменьшить движение»).
private final class ProgressBar: NSView {
    let fraction: Double?
    private var phase: CGFloat = 0
    private var timer: Timer?

    init(_ fraction: Double?) {
        self.fraction = fraction
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        heightAnchor.constraint(equalToConstant: 4).isActive = true
    }
    required init?(coder: NSCoder) { fatalError("not used") }

    override func viewDidMoveToWindow() {
        timer?.invalidate(); timer = nil
        guard window != nil, fraction == nil, !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self else { return }
                self.phase = (self.phase + 0.012).truncatingRemainder(dividingBy: 1.3)
                self.needsDisplay = true
            }
        }
    }

    override func draw(_ dirtyRect: NSRect) {
        let track = NSBezierPath(roundedRect: bounds, xRadius: 2, yRadius: 2)
        Palette.track.setFill(); track.fill()
        let width = bounds.width
        let rect: NSRect
        if let fraction { rect = NSRect(x: 0, y: 0, width: max(4, width * CGFloat(min(max(fraction, 0), 1))), height: bounds.height) }
        else { rect = NSRect(x: (phase - 0.3) * width, y: 0, width: width * 0.3, height: bounds.height) }
        NSGraphicsContext.saveGraphicsState()
        track.addClip()
        Palette.gradient.draw(in: NSBezierPath(roundedRect: rect, xRadius: 2, yRadius: 2), angle: 0)
        NSGraphicsContext.restoreGraphicsState()
    }
}

/// Тумблер в цвете Искры: системный NSSwitch красится только системным акцентом.
private final class Toggle: NSControl {
    var isOn = false { didSet { needsDisplay = true; setAccessibilityValue(isOn ? 1 : 0) } }

    override init(frame: NSRect) {
        super.init(frame: frame)
        translatesAutoresizingMaskIntoConstraints = false
        setAccessibilityRole(.checkBox)
        setAccessibilityLabel("Расшифровка на этом Mac")
    }
    required init?(coder: NSCoder) { fatalError("not used") }

    override var intrinsicContentSize: NSSize { NSSize(width: 46, height: 28) }
    override var acceptsFirstResponder: Bool { isEnabled }

    override func draw(_ dirtyRect: NSRect) {
        let track = NSBezierPath(roundedRect: bounds, xRadius: bounds.height / 2, yRadius: bounds.height / 2)
        (isOn ? Palette.accent : Palette.track).setFill(); track.fill()
        let knob = NSRect(x: isOn ? bounds.width - 25 : 3, y: 3, width: 22, height: 22)
        NSGraphicsContext.saveGraphicsState()
        let shadow = NSShadow(); shadow.shadowBlurRadius = 3; shadow.shadowOffset = NSSize(width: 0, height: -1)
        shadow.shadowColor = NSColor.black.withAlphaComponent(0.3); shadow.set()
        NSColor.white.withAlphaComponent(isEnabled ? 1 : 0.6).setFill()
        NSBezierPath(ovalIn: knob).fill()
        NSGraphicsContext.restoreGraphicsState()
    }

    override func mouseDown(with event: NSEvent) { flip() }
    override func keyDown(with event: NSEvent) {
        if event.charactersIgnoringModifiers == " " { flip() } else { super.keyDown(with: event) }
    }
    override func accessibilityPerformPress() -> Bool { flip(); return true }

    private func flip() {
        guard isEnabled else { return }
        isOn.toggle()
        sendAction(action, to: target)
    }
}

/// Главная кнопка — градиент Искры, как «Готово» на сайте.
private final class PrimaryButton: NSButton {
    convenience init(_ title: String, target: AnyObject?, action: Selector?) {
        self.init(frame: .zero)
        isBordered = false
        self.title = title
        self.target = target
        self.action = action
        attributedTitle = NSAttributedString(string: title, attributes: [
            .foregroundColor: NSColor.white, .font: NSFont.systemFont(ofSize: 13, weight: .medium)])
        translatesAutoresizingMaskIntoConstraints = false
        setContentHuggingPriority(.required, for: .horizontal)
    }

    override var intrinsicContentSize: NSSize {
        let size = attributedTitle.size()
        return NSSize(width: ceil(size.width) + 28, height: 28)
    }

    override func draw(_ dirtyRect: NSRect) {
        let path = NSBezierPath(roundedRect: bounds, xRadius: 7, yRadius: 7)
        Palette.gradient.draw(in: path, angle: -45)
        if isHighlighted { NSColor.black.withAlphaComponent(0.15).setFill(); path.fill() }
        let size = attributedTitle.size()
        attributedTitle.draw(at: NSPoint(x: (bounds.width - size.width) / 2, y: (bounds.height - size.height) / 2))
    }
}

private func secondaryButton(_ title: String, target: AnyObject?, action: Selector) -> NSButton {
    let button = NSButton(title: title, target: target, action: action)
    button.bezelStyle = .rounded
    button.setContentHuggingPriority(.required, for: .horizontal)
    return button
}

private func linkButton(_ title: String, size: CGFloat = 13, color: NSColor = Palette.accent,
                        target: AnyObject?, action: Selector) -> NSButton {
    let button = NSButton(title: title, target: target, action: action)
    button.isBordered = false
    button.attributedTitle = NSAttributedString(string: title, attributes: [
        .foregroundColor: color, .font: NSFont.systemFont(ofSize: size, weight: .medium)])
    button.setContentHuggingPriority(.required, for: .horizontal)
    return button
}

private func text(_ value: String, _ size: CGFloat, _ weight: NSFont.Weight = .regular,
                  _ color: NSColor = .labelColor, wrap: CGFloat? = nil) -> NSTextField {
    let field = wrap == nil ? NSTextField(labelWithString: value) : NSTextField(wrappingLabelWithString: value)
    field.font = .systemFont(ofSize: size, weight: weight)
    field.textColor = color
    if let wrap {
        field.preferredMaxLayoutWidth = wrap
        field.setContentCompressionResistancePriority(.required, for: .vertical)
    } else {
        field.lineBreakMode = .byTruncatingTail
        field.cell?.truncatesLastVisibleLine = true
    }
    return field
}

private func spacer() -> NSView {
    let view = NSView()
    view.setContentHuggingPriority(NSLayoutConstraint.Priority(1), for: .horizontal)
    view.setContentHuggingPriority(NSLayoutConstraint.Priority(1), for: .vertical)
    view.setContentCompressionResistancePriority(NSLayoutConstraint.Priority(1), for: .horizontal)
    return view
}

private func row(_ views: [NSView], spacing: CGFloat = 10, align: NSLayoutConstraint.Attribute = .centerY) -> NSStackView {
    let stack = NSStackView(views: views)
    stack.orientation = .horizontal
    stack.spacing = spacing
    stack.alignment = align
    return stack
}

private func column(_ views: [NSView], spacing: CGFloat = 8, fill: Bool = false) -> NSStackView {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.spacing = spacing
    stack.alignment = .leading
    for view in views {
        stack.addArrangedSubview(view)
        if fill { view.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true }
    }
    return stack
}

private func padded(_ view: NSView, _ horizontal: CGFloat, _ vertical: CGFloat, in container: NSView = NSView()) -> NSView {
    view.translatesAutoresizingMaskIntoConstraints = false
    container.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(view)
    NSLayoutConstraint.activate([
        view.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: horizontal),
        view.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -horizontal),
        view.topAnchor.constraint(equalTo: container.topAnchor, constant: vertical),
        view.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -vertical),
    ])
    return container
}

/// Карточка-список: строки во всю ширину, между ними тонкая линия.
private func card(_ rows: [NSView], radius: CGFloat = 10) -> NSView {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.spacing = 0
    stack.alignment = .leading
    for (index, item) in rows.enumerated() {
        if index > 0 {
            let line = Panel(fill: Palette.line, radius: 0)
            line.heightAnchor.constraint(equalToConstant: 1).isActive = true
            stack.addArrangedSubview(line)
            line.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }
        stack.addArrangedSubview(item)
        item.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
    }
    return padded(stack, 0, 0, in: Panel(fill: Palette.tile, stroke: Palette.line, radius: radius))
}

private enum Tone { case accent, warn, err }

private func pill(_ value: String, _ tone: Tone) -> NSView {
    let color: NSColor = tone == .accent ? Palette.accentText : tone == .warn ? Palette.warn : Palette.err
    let back: NSColor = tone == .accent ? Palette.soft
        : (tone == .warn ? Palette.warn : Palette.err).withAlphaComponent(0.16)
    let label = text(value, 12, .semibold, color)
    label.setContentCompressionResistancePriority(.required, for: .horizontal)
    let view = padded(label, 9, 3, in: Panel(fill: back, radius: 10))
    view.setContentHuggingPriority(.required, for: .horizontal)
    return view
}

/// Огонёк, маскот Искры. Картинки лежат в Resources приложения.
private func mascot(_ mood: String, size: CGFloat) -> NSView {
    let view = NSImageView()
    view.translatesAutoresizingMaskIntoConstraints = false
    if let url = Bundle.main.url(forResource: "mascot-\(mood)", withExtension: "png") { view.image = NSImage(contentsOf: url) }
    view.imageScaling = .scaleProportionallyUpOrDown
    view.widthAnchor.constraint(equalToConstant: size).isActive = true
    view.heightAnchor.constraint(equalToConstant: size).isActive = true
    return view
}

/// Время по-русски, 24 часа, независимо от настроек формата.
private func clock(_ date: Date) -> String {
    let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
    return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
}

private func plural(_ n: Int, _ one: String, _ few: String, _ many: String) -> String {
    let mod10 = n % 10, mod100 = n % 100
    if mod10 == 1 && mod100 != 11 { return one }
    if (2...4).contains(mod10) && !(12...14).contains(mod100) { return few }
    return many
}

// MARK: - Очередь уроков

/// Задание расшифровки, как его видит обработчик (tools/local-transcription:
/// jobs/<id>/job.json и progress.json). Окно читает те же файлы, из которых
/// обработчик отвечает островку Искры на GET /queue, — прогресс совпадает.
struct QueueJob: Equatable {
    enum Kind: Equatable { case running, queued, done, failed }
    let id: String
    let title: String
    let kind: Kind
    let stage: String
    let percent: Int?
    let finished: Date?
    let order: Double
}

private enum JobsReader {
    /// Та же папка, что у обработчика (server.py: ISKRA_TRANSCRIPTION_HOME/jobs).
    static var folder: URL {
        let home = ProcessInfo.processInfo.environment["ISKRA_TRANSCRIPTION_HOME"].map { URL(fileURLWithPath: $0, isDirectory: true) }
            ?? Companion.appSupport.appendingPathComponent("transcription", isDirectory: true)
        return home.appendingPathComponent("jobs", isDirectory: true)
    }

    static func read(now: Date = Date()) -> [QueueJob] {
        let fm = FileManager.default
        let dirs = (try? fm.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? []
        let today = Calendar.current.startOfDay(for: now)
        var active: [QueueJob] = []
        var finished: [QueueJob] = []
        for dir in dirs {
            let file = dir.appendingPathComponent("job.json")
            guard let data = try? Data(contentsOf: file),
                  let job = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let state = job["state"] as? [String: Any] else { continue }
            if state["cancelled"] as? Bool == true { continue }
            let id = job["id"] as? String ?? dir.lastPathComponent
            let stage = state["stage"] as? String ?? ""
            let changed = modified(file)
            let title = titleOf(job)
            if state["done"] as? Bool == true || state["error"] as? Bool == true {
                guard changed >= today else { continue }
                let ok = state["done"] as? Bool == true
                finished.append(QueueJob(id: id, title: title, kind: ok ? .done : .failed, stage: stage,
                                         percent: nil, finished: changed, order: -changed.timeIntervalSince1970))
                continue
            }
            // Задание без движения полдня — след старого сбоя, а не работа.
            let progressFile = dir.appendingPathComponent("progress.json")
            guard now.timeIntervalSince(max(changed, modified(progressFile))) < 12 * 3600 else { continue }
            let queuedAt = (state["queuedAt"] as? Double) ?? changed.timeIntervalSince1970
            if stage == "В очереди" {
                active.append(QueueJob(id: id, title: title, kind: .queued, stage: stage, percent: nil, finished: nil, order: queuedAt))
            } else {
                active.append(QueueJob(id: id, title: title, kind: .running, stage: stage,
                                       percent: percent(progressFile, stage: stage), finished: nil, order: queuedAt - 1e10))
            }
        }
        active.sort { $0.order < $1.order }
        finished.sort { $0.order < $1.order }
        return active + finished.prefix(3)
    }

    private static func titleOf(_ job: [String: Any]) -> String {
        let lesson = (job["lessonTitle"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let course = (job["courseTitle"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        switch (course.isEmpty, lesson.isEmpty) {
        case (false, false): return "\(course) · \(lesson)"
        case (true, false): return lesson
        case (false, true): return course
        default: return "Запись урока"
        }
    }

    private static func modified(_ url: URL) -> Date {
        (try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
    }

    private static func percent(_ url: URL, stage: String) -> Int? {
        guard let data = try? Data(contentsOf: url),
              let detail = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              detail["step"] as? String == stage,
              let total = (detail["total"] as? NSNumber)?.doubleValue, total > 0,
              let current = (detail["current"] as? NSNumber)?.doubleValue else { return nil }
        return min(99, max(0, Int(current / total * 100)))
    }
}

// MARK: - Окно

enum Phase: Equatable {
    case checking          // окно открылось, смотрим, работает ли служба
    case installing        // копируем приложение в «Программы»
    case openInstalled     // нужно открыть установленную копию
    case permission        // macOS ждёт разрешения фоновой службы
    case preparing         // служба запускается, в первый раз — качает компоненты
    case failed(String, step: Int)  // step: 1 — разрешение, 2 — компоненты, 0 — установка
    case ready             // всё готово: тумблер и очередь
}

private struct Screen: Equatable {
    var phase: Phase
    var serviceOn: Bool
    var jobs: [QueueJob]
    var version: String
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    private var window: NSWindow!
    private var root: NSView!
    private var stack: NSStackView!
    private var shown: Screen?
    private var phase: Phase = .checking
    private var serviceOn = false
    private var jobs: [QueueJob] = []
    private var versionNote: String?
    private var knownFinished: Set<String>?
    private var askedNotifications = false
    private var updateTask: Task<Void, Never>?
    private var updateTimer: Timer?
    private var pollTimer: Timer?
    private var polling = false

    private var startTask: Task<Void, Never>?
    private var pendingApproval = false
    private var requestedStart = false
    private var installing = false
    private let preview = ProcessInfo.processInfo.environment["ISKRA_WINDOW_PREVIEW"]

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let preview { showPreview(preview); return }
        UNUserNotificationCenter.current().delegate = self
        buildWindow()
        requestedStart = requestedStart || CommandLine.arguments.contains("--start")
        buildMenu()
        if installInApplicationsIfNeeded() { return }
        Companion.trashOtherCopies()
        handleStart()
        poll()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.poll() }
        }
        checkForUpdates(userInitiated: false)
        updateTimer = Timer.scheduledTimer(withTimeInterval: Updater.checkInterval, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.checkForUpdates(userInitiated: false) }
        }
    }

    private func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem()
        main.addItem(appItem)
        let menu = NSMenu(title: "Искра · Расшифровка")
        menu.addItem(withTitle: "Проверить обновления…", action: #selector(checkUpdatesClicked), keyEquivalent: "").target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: "Скрыть", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        menu.addItem(withTitle: "Выйти", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = menu
        let windowItem = NSMenuItem()
        main.addItem(windowItem)
        let windowMenu = NSMenu(title: "Окно")
        windowMenu.addItem(withTitle: "Закрыть", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        windowItem.submenu = windowMenu
        NSApp.mainMenu = main
    }

    @objc private func checkUpdatesClicked() { checkForUpdates(userInitiated: true) }

    /// Фоновая проверка не чаще раза в checkInterval и молча; ручная — всегда
    /// и с ответом. Пока окно запускает службу, перезапуск откладываем.
    private func checkForUpdates(userInitiated: Bool) {
        guard updateTask == nil, !installing, Companion.isInstalled(Bundle.main.bundleURL) else { return }
        let defaults = UserDefaults.standard
        if !userInitiated, Date().timeIntervalSince1970 - defaults.double(forKey: Updater.lastCheckKey) < Updater.checkInterval - 60 { return }
        defaults.set(Date().timeIntervalSince1970, forKey: Updater.lastCheckKey)
        updateTask = Task {
            defer { updateTask = nil }
            do {
                guard let manifest = try await Updater.available() else {
                    if userInitiated { inform("Установлена последняя версия", "Версия \(Updater.currentVersion).") }
                    return
                }
                versionNote = "Версия \(Updater.currentVersion) · устанавливаем обновление \(manifest.version)…"
                render()
                try await Updater.install(manifest)
                await startTask?.value
                versionNote = "Обновлено до \(manifest.version) · перезапуск…"
                render()
                Updater.relaunch(arguments: window.isVisible ? [] : ["--start"])
                NSApp.terminate(nil)
            } catch {
                versionNote = nil
                render()
                if userInitiated { inform("Не удалось обновить", error.localizedDescription) }
            }
        }
    }

    private func inform(_ title: String, _ text: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = text
        NSApp.activate(ignoringOtherApps: true)
        alert.runModal()
    }

    private func versionText() -> String {
        let build = (Bundle.main.infoDictionary?["IskraInstallerVersion"] as? String ?? "").prefix(7)
        return "Версия \(Updater.currentVersion) · сборка \(build)"
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        guard urls.contains(where: { $0.scheme == appURLScheme && $0.host == "start" }) else { return }
        requestedStart = true
        if window != nil && !installing { handleStart() }
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        if pendingApproval && Companion.service.status == .enabled { handleStart() }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool {
        if !hasVisibleWindows { window?.makeKeyAndOrderFront(nil) }
        return true
    }

    private func installInApplicationsIfNeeded() -> Bool {
        let target = Companion.installedURL
        let current = Bundle.main.bundleURL
        if Companion.isInstalled(current) { return false }
        // A handoff may only open the installed copy. If Launch Services
        // resolves it to this copy again, stop rather than handing off again.
        if CommandLine.arguments.contains("--installed-handoff")
            || ProcessInfo.processInfo.environment["ISKRA_INSTALL_HANDOFF"] == "1" {
            showInstallRecovery()
            return true
        }
        installing = true
        setPhase(.installing)
        do {
            try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
            let lockURL = target.deletingLastPathComponent().appendingPathComponent(".iskra-transcription-install.lock")
            let lock = open(lockURL.path, O_CREAT | O_WRONLY | O_CLOEXEC | O_NOFOLLOW, 0o600)
            guard lock >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
            guard flock(lock, LOCK_EX | LOCK_NB) == 0 else {
                close(lock)
                NSApp.terminate(nil)
                return true
            }
            defer { close(lock) }
            let installedVersion = Bundle(url: target)?.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
            let currentVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
            if installedVersion.compare(currentVersion, options: .numeric) == .orderedAscending {
                let staging = target.deletingLastPathComponent()
                    .appendingPathComponent(".Iskra-transcription-install-\(UUID().uuidString).app", isDirectory: true)
                defer { try? FileManager.default.removeItem(at: staging) }
                try FileManager.default.copyItem(at: current, to: staging)
                if FileManager.default.fileExists(atPath: target.path) {
                    _ = try FileManager.default.replaceItemAt(target, withItemAt: staging)
                } else {
                    try FileManager.default.moveItem(at: staging, to: target)
                }
            }
            LSRegisterURL(target as CFURL, true)
            installing = false
            showInstallRecovery()
        } catch {
            installing = false
            showError("Не удалось установить приложение в папку «Программы». \(error.localizedDescription)", step: 0)
        }
        return true
    }

    // MARK: Отрисовка

    private func buildWindow() {
        let width: CGFloat = 480
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: width, height: 420), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        // Keep the ARC-owned window alive when the red close button hides it.
        // Dock reopen and asynchronous status updates reuse this same window.
        window.isReleasedWhenClosed = false
        window.title = "Искра · Расшифровка"
        root = Panel(fill: .windowBackgroundColor, radius: 0)
        root.translatesAutoresizingMaskIntoConstraints = true
        window.contentView = root
        stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        root.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -24),
            stack.topAnchor.constraint(equalTo: root.topAnchor, constant: 18),
            stack.bottomAnchor.constraint(equalTo: root.bottomAnchor, constant: -18),
            stack.widthAnchor.constraint(equalToConstant: width - 48),
        ])
        render(force: true)
        window.center()

        if preview == nil && !requestedStart && !CommandLine.arguments.contains("--start") {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    private func setPhase(_ next: Phase) {
        phase = next
        render()
    }

    private func render(force: Bool = false) {
        guard let stack else { return }
        let screen = Screen(phase: phase, serviceOn: serviceOn, jobs: jobs, version: versionNote ?? versionText())
        if !force && screen == shown { return }
        shown = screen
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let body: [NSView]
        switch phase {
        case .ready, .checking: body = readyViews()
        default: body = setupViews()
        }
        for view in body + [spacer(), footer(screen.version)] {
            stack.addArrangedSubview(view)
            view.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }
        // Высота — по содержимому, но не ниже 400, чтобы окно не прыгало между состояниями.
        stack.layoutSubtreeIfNeeded()
        let height = max(400, stack.fittingSize.height + 36)
        let content = NSRect(x: 0, y: 0, width: 480, height: height)
        var frame = window.frameRect(forContentRect: content)
        if abs(frame.height - window.frame.height) > 0.5 {
            frame.origin = NSPoint(x: window.frame.minX, y: window.frame.maxY - frame.height)
            window.setFrame(frame, display: true)
        }
    }

    private func footer(_ version: String) -> NSView {
        let label = text(version, 11, .regular, .tertiaryLabelColor)
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let dot = text("·", 11, .regular, .tertiaryLabelColor)
        return row([label, spacer(),
                    linkButton("Журнал", size: 11, color: .secondaryLabelColor, target: self, action: #selector(logClicked)),
                    dot,
                    linkButton("Проверить обновления", size: 11, color: .secondaryLabelColor, target: self, action: #selector(checkUpdatesClicked))],
                   spacing: 4)
    }

    private func head(_ mood: String, _ title: String, _ detail: String, _ badge: (String, Tone)?) -> NSView {
        let width: CGFloat = badge == nil ? 330 : 210
        let words = column([text(title, 18, .semibold, wrap: width), text(detail, 12.5, .regular, .secondaryLabelColor, wrap: width)], spacing: 3)
        var items: [NSView] = [mascot(mood, size: 72), words, spacer()]
        if let badge { items.append(pill(badge.0, badge.1)) }
        return row(items, spacing: 12)
    }

    private enum StepState { case done, now, todo, bad }

    private func step(_ state: StepState, _ number: Int, _ title: String, _ detail: String,
                      action: NSView? = nil, progress: ProgressBar? = nil) -> NSView {
        let dot: Panel
        let mark: String
        switch state {
        case .done: dot = Panel(fill: Palette.ok, radius: 11); mark = "✓"
        case .now: dot = Panel(radius: 11, gradient: Palette.gradient); mark = "\(number)"
        case .bad: dot = Panel(fill: Palette.err, radius: 11); mark = "!"
        case .todo: dot = Panel(stroke: .tertiaryLabelColor, radius: 11); mark = "\(number)"
        }
        let markLabel = text(mark, 12, .bold, state == .todo ? .secondaryLabelColor : .white)
        markLabel.alignment = .center
        markLabel.translatesAutoresizingMaskIntoConstraints = false
        dot.addSubview(markLabel)
        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 22), dot.heightAnchor.constraint(equalToConstant: 22),
            markLabel.centerXAnchor.constraint(equalTo: dot.centerXAnchor), markLabel.centerYAnchor.constraint(equalTo: dot.centerYAnchor),
        ])
        let titleLabel = text(title, 13, state == .todo ? .medium : .semibold, state == .todo ? .secondaryLabelColor : .labelColor)
        var lines: [NSView] = [titleLabel, text(detail, 12, .regular, .secondaryLabelColor, wrap: action == nil ? 330 : 230)]
        if let progress {
            lines.append(progress)
            progress.widthAnchor.constraint(equalToConstant: 220).isActive = true
        }
        var items: [NSView] = [dot, column(lines, spacing: 2), spacer()]
        if let action { items.append(action) }
        return padded(row(items, spacing: 12), 14, 12)
    }

    private func setupViews() -> [NSView] {
        let back = secondaryButton("Вернуться в Искру", target: self, action: #selector(openIskra))
        switch phase {
        case .installing:
            return [head("think", "Устанавливаем приложение", "Копируем «Искра · Расшифровка» в папку «Программы».", nil)]
        case .openInstalled:
            return [head("wave", "Откройте установленное приложение",
                         "Покажите его в Finder и откройте выделенный файл. Затем вернитесь в Искру.", nil),
                    row([PrimaryButton("Показать в Finder", target: self, action: #selector(revealInstalledApp))])]
        case .permission:
            return [head("think", "Нужно одно разрешение", "macOS спросит один раз. Потом окно обновится само.", ("Нужно действие", .warn)),
                    card([step(.now, 1, "Разрешение macOS", "Разрешите фоновую службу Искры",
                               action: PrimaryButton("Разрешить", target: self, action: #selector(settingsClicked))),
                          step(.todo, 2, "Компоненты", "Модель распознавания и звук"),
                          step(.todo, 3, "Обработчик", "Принимает уроки из Искры")]),
                    row([back])]
        case .preparing:
            return [head("think", "Готовим расшифровку", "В первый раз это займёт несколько минут. Можно вернуться в Искру.", ("Подготовка", .accent)),
                    card([step(.done, 1, "Разрешение macOS", "Разрешено"),
                          step(.now, 2, "Компоненты", "Скачиваем модель распознавания и звук", progress: ProgressBar(nil)),
                          step(.todo, 3, "Обработчик", "Запустится сам")]),
                    row([back])]
        case .failed(let message, let failedStep):
            let retry = PrimaryButton("Повторить", target: self, action: #selector(startClicked))
            if failedStep == 0 { return [head("sad", "Не получилось", message, nil)] }
            let steps = failedStep == 1
                ? [step(.bad, 1, "Разрешение macOS", message, action: PrimaryButton("Настройки", target: self, action: #selector(settingsClicked))),
                   step(.todo, 2, "Компоненты", "Ждут разрешения"),
                   step(.todo, 3, "Обработчик", "Ждёт разрешения")]
                : [step(.done, 1, "Разрешение macOS", "Разрешено"),
                   step(.bad, 2, "Компоненты", message, action: retry),
                   step(.todo, 3, "Обработчик", "Ждёт компоненты")]
            return [head("sad", "Не получилось подготовить", "Проверьте интернет и нажмите «Повторить».", ("Ошибка", .err)),
                    card(steps), row([back])]
        case .ready, .checking:
            return readyViews()
        }
    }

    private func readyViews() -> [NSView] {
        let checking = phase == .checking
        let on = serviceOn && !checking
        let running = jobs.filter { $0.kind == .running }.count
        let queued = jobs.filter { $0.kind == .queued }.count
        let recentDone = jobs.contains { $0.kind == .done && ($0.finished.map { Date().timeIntervalSince($0) < 600 } ?? false) }
        let mood = !on ? "wave" : running > 0 ? "think" : recentDone ? "joy" : "wave"
        let subtitle: String
        if checking { subtitle = "Проверяем службу…" }
        else if !on { subtitle = "Выключена · Искра включит её сама, когда пришлёт урок" }
        else if running > 0 {
            subtitle = "Расшифровывает \(running) \(plural(running, "урок", "урока", "уроков"))"
                + (queued > 0 ? ", ещё \(queued) в очереди" : "")
        } else if queued > 0 { subtitle = "\(queued) \(plural(queued, "урок ждёт", "урока ждут", "уроков ждут")) очереди" }
        else if recentDone { subtitle = "Включена · урок готов" }
        else { subtitle = "Включена · ждёт уроки из Искры" }

        let toggle = Toggle()
        toggle.isOn = on
        toggle.isEnabled = !checking && startTask == nil
        toggle.target = self
        toggle.action = #selector(toggleClicked(_:))
        let titleLabel = text("Расшифровка на этом Mac", 15, .semibold)
        let subtitleLabel = text(subtitle, 12, .regular, .secondaryLabelColor, wrap: 280)
        let tile = padded(row([mascot(mood, size: 56), column([titleLabel, subtitleLabel], spacing: 3), spacer(), toggle], spacing: 12),
                          14, 10, in: Panel(fill: Palette.tile, stroke: Palette.line, radius: 14))

        var counts: [String] = []
        if running > 0 { counts.append("\(running) \(plural(running, "идёт", "идут", "идут"))") }
        if queued > 0 { counts.append("\(queued) \(plural(queued, "ждёт", "ждут", "ждут"))") }
        let finished = jobs.filter { $0.kind == .done }.count
        if counts.isEmpty && finished > 0 { counts.append("готово сегодня: \(finished)") }
        let header = row([text("Уроки", 13, .semibold), spacer(), text(counts.joined(separator: " · "), 12, .regular, .secondaryLabelColor)])

        let list: NSView
        if jobs.isEmpty {
            let empty = text("Сейчас ничего не расшифровывается. Загрузите видео урока в Искре — оно появится здесь.",
                             12, .regular, .secondaryLabelColor, wrap: 400)
            empty.alignment = .center
            list = card([padded(empty, 14, 14)])
        } else {
            list = card(jobs.map { jobRow($0, serviceOn: on) })
        }

        let facts = row([text("Фоновая служба macOS", 12, .regular, .secondaryLabelColor), spacer(),
                         text(preview != nil || Companion.service.status == .enabled ? "разрешена ·" : "нет разрешения ·", 12, .medium),
                         linkButton("Настройки", size: 12, target: self, action: #selector(settingsClicked))], spacing: 4)
        let open: NSView = on && running == 0 && recentDone
            ? PrimaryButton("Открыть Искру", target: self, action: #selector(openIskra))
            : secondaryButton("Открыть Искру", target: self, action: #selector(openIskra))
        return [tile, header, list, facts, row([open])]
    }

    private func jobRow(_ job: QueueJob, serviceOn: Bool) -> NSView {
        let title = text(job.title, 13, job.kind == .queued ? .medium : .semibold, job.kind == .queued ? .secondaryLabelColor : .labelColor)
        title.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let trailing: NSView
        let detail: String
        var bar: ProgressBar?
        switch job.kind {
        case .running:
            trailing = text(job.percent.map { "\($0)%" } ?? "", 12, .regular, .secondaryLabelColor)
            detail = serviceOn ? job.stage : "Продолжится, когда расшифровка включится"
            if serviceOn { bar = ProgressBar(job.percent.map { Double($0) / 100 }) }
        case .queued:
            trailing = text("в очереди", 12, .regular, .secondaryLabelColor)
            detail = serviceOn ? "Начнётся, когда освободится место" : "Начнётся, когда расшифровка включится"
        case .done:
            trailing = linkButton("Открыть в Искре", size: 12, target: self, action: #selector(openIskra))
            detail = job.finished.map { "Готово сегодня в \(clock($0))" } ?? "Готово сегодня"
        case .failed:
            trailing = text("ошибка", 12, .medium, Palette.err)
            detail = job.stage
        }
        let mark: NSView? = job.kind == .done ? text("✓", 13, .bold, Palette.ok) : nil
        let top = row((mark.map { [$0] } ?? []) + [title, spacer(), trailing], spacing: 6)
        var lines: [NSView] = [top, text(detail, 12, .regular, .secondaryLabelColor, wrap: 400)]
        if let bar { lines.append(bar) }
        return padded(column(lines, spacing: 4, fill: true), 14, 10)
    }

    // MARK: Служба

    /// Раз в 2 секунды: жива ли служба и что в очереди. Окно перерисовывается,
    /// только если что-то поменялось.
    private func poll() {
        guard !polling else { return }
        polling = true
        Task {
            defer { polling = false }
            let on = await Companion.isRunning()
            let list = await Task.detached(priority: .utility) { JobsReader.read() }.value
            serviceOn = on
            jobs = list
            announceFinished()
            if on, startTask == nil {
                switch phase {
                case .checking, .failed(_, step: 2): phase = .ready
                default: break
                }
            } else if !on, phase == .checking, startTask == nil {
                phase = .ready
            }
            render()
        }
    }

    private func handleStart() {
        guard startTask == nil, !installing, phase != .openInstalled else { return }
        guard Companion.isInstalled(Bundle.main.bundleURL) else {
            _ = installInApplicationsIfNeeded()
            return
        }
        startTask = Task {
            defer { startTask = nil; render(force: true) }
            do {
                try Companion.register()
                if Companion.service.status == .requiresApproval {
                    pendingApproval = true
                    setPhase(.permission)
                    window.makeKeyAndOrderFront(nil)
                    NSApp.activate(ignoringOtherApps: true)
                    return
                }
                guard Companion.service.status == .enabled else {
                    showError("macOS не зарегистрировала обработчик. Переустановите приложение и откройте его из папки «Программы».", step: 1)
                    return
                }
                pendingApproval = false
                if !(await Companion.isRunning()) {
                    try Task.checkCancellation()
                    try Companion.start()
                }
                // Обычный запуск — пара секунд; шаги показываем, только если он затянулся
                // (первый запуск качает компоненты), чтобы окно не мигало.
                let started = ContinuousClock.now
                let deadline = started + .seconds(285)
                while ContinuousClock.now < deadline {
                    try Task.checkCancellation()
                    if await Companion.isRunning() {
                        try Task.checkCancellation()
                        serviceOn = true
                        setPhase(.ready)
                        return
                    }
                    if ContinuousClock.now - started > .seconds(2), phase != .preparing { setPhase(.preparing) }
                    try await Task.sleep(for: .seconds(1))
                }
                showError("Обработчик не ответил. Проверьте интернет и повторите запуск.", step: 2)
            } catch is CancellationError {
                return
            } catch { showError(error.localizedDescription, step: 2) }
        }
        render(force: true)
    }

    private func showInstallRecovery() {
        guard FileManager.default.fileExists(atPath: Companion.installedURL.path) else {
            showError("Установленная копия не найдена. Закройте это окно и снова откройте приложение из образа.", step: 0)
            return
        }
        setPhase(.openInstalled)
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func revealInstalledApp() {
        NSWorkspace.shared.activateFileViewerSelecting([Companion.installedURL])
    }

    private func showError(_ message: String, step: Int) {
        setPhase(.failed(message, step: step))
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func startClicked() { handleStart() }

    @objc private func toggleClicked(_ sender: Toggle) {
        if sender.isOn { handleStart(); return }
        let active = jobs.filter { $0.kind == .running || $0.kind == .queued }
        if !active.isEmpty {
            let alert = NSAlert()
            alert.messageText = "Выключить расшифровку?"
            alert.informativeText = "\(active.count) \(plural(active.count, "урок", "урока", "уроков")) в работе. Расшифровка продолжится, когда вы снова её включите."
            alert.addButton(withTitle: "Выключить")
            alert.addButton(withTitle: "Отмена")
            guard alert.runModal() == .alertFirstButtonReturn else { sender.isOn = true; return }
        }
        pendingApproval = false
        startTask?.cancel()
        do {
            try Companion.stop()
            serviceOn = false
            setPhase(.ready)
        } catch { showError(error.localizedDescription, step: 2) }
    }

    @objc private func settingsClicked() { SMAppService.openSystemSettingsLoginItems() }
    @objc private func openIskra() { NSWorkspace.shared.open(iskraURL) }
    @objc private func logClicked() {
        let log = Companion.appSupport.appendingPathComponent("transcription-service.log")
        if FileManager.default.fileExists(atPath: log.path) { NSWorkspace.shared.open(log) }
        else { inform("Журнал пока пуст", "Он появится после первого запуска обработчика.") }
    }

    // MARK: Уведомления

    /// Готовый урок — уведомление macOS. Уроки, готовые до открытия окна, не объявляем.
    private func announceFinished() {
        let finished = Set(jobs.filter { $0.kind == .done }.map(\.id))
        defer { knownFinished = (knownFinished ?? []).union(finished) }
        if !askedNotifications, jobs.contains(where: { $0.kind == .running || $0.kind == .queued }) {
            askedNotifications = true
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        }
        guard let known = knownFinished else { return }
        for job in jobs where job.kind == .done && !known.contains(job.id) {
            let content = UNMutableNotificationContent()
            content.title = "Расшифровка готова"
            content.body = job.title
            content.sound = .default
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: job.id, content: content, trigger: nil))
        }
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                            withCompletionHandler completionHandler: @escaping () -> Void) {
        DispatchQueue.main.async { NSWorkspace.shared.open(iskraURL) }
        completionHandler()
    }

    // MARK: Просмотр состояний для макетов и проверки

    /// ISKRA_WINDOW_PREVIEW=<состояние> показывает окно с примером данных и ничего
    /// не запускает; с ISKRA_WINDOW_SNAPSHOT=<путь.png> сохраняет снимок и выходит.
    private func showPreview(_ name: String) {
        let env = ProcessInfo.processInfo.environment
        if let look = env["ISKRA_WINDOW_APPEARANCE"] { NSApp.appearance = NSAppearance(named: look == "dark" ? .darkAqua : .aqua) }
        let now = Date()
        let lesson14 = QueueJob(id: "a", title: "Химия · Урок 14. Окислительно-восстановительные реакции", kind: .running,
                                stage: "Распознаём речь", percent: 48, finished: nil, order: 0)
        let lesson9 = QueueJob(id: "b", title: "Биология · Урок 9. Митоз и мейоз", kind: .queued, stage: "В очереди",
                               percent: nil, finished: nil, order: 1)
        let lesson13 = QueueJob(id: "c", title: "Химия · Урок 13. Электролиз", kind: .done, stage: "Готово",
                                percent: nil, finished: now.addingTimeInterval(-3 * 3600), order: 2)
        let lesson14done = QueueJob(id: "a", title: lesson14.title, kind: .done, stage: "Готово",
                                    percent: nil, finished: now.addingTimeInterval(-30), order: 1)
        switch name {
        case "permission": phase = .permission
        case "preparing": phase = .preparing
        case "failed": phase = .failed("Обработчик не ответил. Проверьте интернет и повторите запуск.", step: 2)
        case "install": phase = .openInstalled
        case "idle": phase = .ready; serviceOn = true
        case "work": phase = .ready; serviceOn = true; jobs = [lesson14, lesson9, lesson13]
        case "done": phase = .ready; serviceOn = true; jobs = [lesson14done, lesson13]
        case "live": phase = .ready; serviceOn = true; jobs = JobsReader.read()
        default: phase = .ready; serviceOn = false; jobs = [lesson13]
        }
        buildWindow()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        guard let out = env["ISKRA_WINDOW_SNAPSHOT"] else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [self] in
            MainActor.assumeIsolated {
                let view = window.contentView!
                view.effectiveAppearance.performAsCurrentDrawingAppearance {
                    if let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) {
                        view.cacheDisplay(in: view.bounds, to: rep)
                        try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: out))
                    }
                }
                exit(0)
            }
        }
    }
}

MainActor.assumeIsolated {
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.setActivationPolicy(.regular)
    app.run()
}
