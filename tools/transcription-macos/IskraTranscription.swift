import AppKit
import CoreServices
import Foundation
import ServiceManagement

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
        url.resolvingSymlinksInPath() == installedURL.resolvingSymlinksInPath()
            || url.deletingLastPathComponent().resolvingSymlinksInPath().path == "/Applications"
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
            throw failure("Откройте установленную копию «Искра — расшифровка» из папки «Программы».")
        }
        try installResources()
        if service.status == .notRegistered {
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

private func runService() -> Never {
    do {
        try Companion.installResources()
        let logURL = Companion.appSupport.appendingPathComponent("transcription-service.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            _ = FileManager.default.createFile(atPath: logURL.path, contents: nil, attributes: [.posixPermissions: 0o600])
        }
        let log = try FileHandle(forWritingTo: logURL)
        try log.seekToEnd()
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = [Companion.module.appendingPathComponent("start.command").path]
        process.currentDirectoryURL = Companion.module
        process.environment = ProcessInfo.processInfo.environment.merging([
            "ISKRA_FFMPEG": Bundle.main.resourceURL!.appendingPathComponent(moduleName).appendingPathComponent("ffmpeg").path,
            "ISKRA_FRAME_TEXT": Bundle.main.bundleURL.appendingPathComponent("Contents/MacOS/IskraFrameText").path,
            "ISKRA_PACKAGED_MODULE": "1",
        ]) { _, new in new }
        process.standardOutput = log
        process.standardError = log
        try process.run()
        process.waitUntilExit()
        exit(process.terminationStatus)
    } catch {
        FileHandle.standardError.write(Data("Iskra transcription service: \(error.localizedDescription)\n".utf8))
        exit(1)
    }
}

if CommandLine.arguments.contains("--service") { runService() }

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var statusLabel: NSTextField!
    private var detailLabel: NSTextField!

    private var startTask: Task<Void, Never>?
    private var pendingApproval = false
    private var requestedStart = false
    private var installing = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildWindow()
        requestedStart = requestedStart || CommandLine.arguments.contains("--start")
        if installInApplicationsIfNeeded() { return }
        if requestedStart { handleStart(); return }
        do {
            try Companion.register()
            showRegistrationStatus()
        } catch { showError(error.localizedDescription) }
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
        installing = true
        statusLabel.stringValue = "Устанавливаем приложение…"
        do {
            try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
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
            let config = NSWorkspace.OpenConfiguration()
            config.allowsRunningApplicationSubstitution = false
            config.createsNewApplicationInstance = true
            // Forward a browser launch even when Launch Services picked the downloaded copy.
            config.arguments = ["--start"]
            NSWorkspace.shared.openApplication(at: target, configuration: config) { _, error in
                DispatchQueue.main.async {
                    self.installing = false
                    if let error {
                        self.showError("Откройте установленную копию из папки «Программы». \(error.localizedDescription)")
                    } else {
                        NSApp.terminate(nil)
                    }
                }
            }
        } catch {
            installing = false
            showError("Не удалось установить приложение в папку «Программы». \(error.localizedDescription)")
        }
        return true
    }

    private func buildWindow() {
        let frame = NSRect(x: 0, y: 0, width: 460, height: 300)
        window = NSWindow(contentRect: frame, styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "Искра — расшифровка"
        window.center()
        let content = NSView(frame: frame)
        window.contentView = content

        let title = label("Фоновый модуль Искры", size: 22, weight: .semibold)
        title.frame = NSRect(x: 28, y: 236, width: 404, height: 30); content.addSubview(title)
        statusLabel = label("Проверяем службу…", size: 14, weight: .medium)
        statusLabel.frame = NSRect(x: 28, y: 202, width: 404, height: 22); content.addSubview(statusLabel)
        detailLabel = label("При расшифровке Искра запустит обработчик в фоне. Терминал не нужен.", size: 12, weight: .regular)
        detailLabel.textColor = .secondaryLabelColor; detailLabel.lineBreakMode = .byWordWrapping; detailLabel.maximumNumberOfLines = 3
        detailLabel.frame = NSRect(x: 28, y: 146, width: 404, height: 48); content.addSubview(detailLabel)

        let start = button("Запустить обработчик", action: #selector(startClicked))
        start.frame = NSRect(x: 28, y: 92, width: 196, height: 38); content.addSubview(start)
        let stop = button("Остановить", action: #selector(stopClicked))
        stop.frame = NSRect(x: 232, y: 92, width: 110, height: 38); content.addSubview(stop)
        let settings = button("Настройки фоновой службы", action: #selector(settingsClicked))
        settings.frame = NSRect(x: 28, y: 42, width: 240, height: 32); content.addSubview(settings)

        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let build = (Bundle.main.infoDictionary?["IskraInstallerVersion"] as? String ?? "").prefix(7)
        let versionLabel = label("Версия \(version) · сборка \(build)", size: 10, weight: .regular)
        versionLabel.textColor = .tertiaryLabelColor
        versionLabel.frame = NSRect(x: 28, y: 14, width: 404, height: 16); content.addSubview(versionLabel)

        if !requestedStart && !CommandLine.arguments.contains("--start") {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    private func label(_ text: String, size: CGFloat, weight: NSFont.Weight) -> NSTextField {
        let field = NSTextField(labelWithString: text)
        field.font = .systemFont(ofSize: size, weight: weight)
        return field
    }

    private func button(_ title: String, action: Selector) -> NSButton {
        let button = NSButton(title: title, target: self, action: action)
        button.bezelStyle = .rounded
        return button
    }

    private func handleStart() {
        guard startTask == nil, !installing else { return }
        guard Companion.isInstalled(Bundle.main.bundleURL) else {
            _ = installInApplicationsIfNeeded()
            return
        }
        startTask = Task {
            defer { startTask = nil }
            do {
                try Companion.register()
                if Companion.service.status == .requiresApproval {
                    pendingApproval = true
                    showRegistrationStatus()
                    window.makeKeyAndOrderFront(nil)
                    NSApp.activate(ignoringOtherApps: true)
                    return
                }
                pendingApproval = false
                statusLabel.stringValue = "Запускаем обработчик…"
                detailLabel.stringValue = "При первом запуске подготавливаем компоненты. Можно вернуться в Искру."
                if !(await Companion.isRunning()) {
                    try Task.checkCancellation()
                    try Companion.start()
                }
                let deadline = ContinuousClock.now + .seconds(285)
                while ContinuousClock.now < deadline {
                    try Task.checkCancellation()
                    if await Companion.isRunning() {
                        try Task.checkCancellation()
                        statusLabel.stringValue = "Служба работает"
                        detailLabel.stringValue = "Вернитесь в Искру. Браузер продолжит подключение или обработку."
                        return
                    }
                    try await Task.sleep(for: .seconds(1))
                }
                showError("Обработчик не ответил. Проверьте интернет и повторите запуск. Журнал: transcription-service.log в папке данных Искры.")
            } catch is CancellationError {
                return
            } catch { showError(error.localizedDescription) }
        }
    }

    private func showRegistrationStatus() {
        switch Companion.service.status {
        case .enabled:
            statusLabel.stringValue = "Фоновая служба разрешена"
            detailLabel.stringValue = "Подключите компьютер или запустите расшифровку в Искре."
        case .requiresApproval:
            statusLabel.stringValue = "Нужно разрешение macOS"
            detailLabel.stringValue = "Откройте настройки кнопкой ниже и разрешите фоновую службу Искры. Затем вернитесь сюда."
        default:
            showError("macOS не зарегистрировала обработчик. Переустановите приложение и откройте его из папки «Программы».")
        }
    }

    private func showError(_ message: String) {
        statusLabel?.stringValue = "Не удалось запустить службу"
        detailLabel?.stringValue = message
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func startClicked() { handleStart() }
    @objc private func stopClicked() {
        pendingApproval = false
        startTask?.cancel()
        do {
            try Companion.stop()
            statusLabel.stringValue = "Служба остановлена"
            detailLabel.stringValue = "Службу можно снова запустить из Искры."
        } catch { showError(error.localizedDescription) }
    }
    @objc private func settingsClicked() { SMAppService.openSystemSettingsLoginItems() }

}

MainActor.assumeIsolated {
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.setActivationPolicy(.regular)
    app.run()
}
