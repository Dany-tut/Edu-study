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
    static var service: SMAppService { SMAppService.agent(plistName: agentPlist) }

    static func installResources() throws {
        try FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
        let marker = module.appendingPathComponent(".launcher-install-version")
        if FileManager.default.fileExists(atPath: marker.path) { return }
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
        try Data((Bundle.main.infoDictionary?["IskraInstallerVersion"] as? String ?? "1").utf8).write(to: marker)
    }

    static func register() throws {
        try installResources()
        if service.status == .notRegistered { try service.register() }
    }

    static func start() throws {
        try register()
        guard service.status == .enabled else {
            throw NSError(domain: "IskraTranscription", code: 2, userInfo: [NSLocalizedDescriptionKey: "Разрешите фоновую службу Искры в настройках входа и фоновых объектов Mac."])
        }
        try launchctl(["kickstart", "-k", "gui/\(getuid())/\(agentLabel)"])
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

    static func isRunning() -> Bool {
        guard let url = URL(string: "http://127.0.0.1:18764/version") else { return false }
        var request = URLRequest(url: url, timeoutInterval: 1)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("https://iskra-study.ru", forHTTPHeaderField: "Origin")
        request.setValue("transcription-v1", forHTTPHeaderField: "X-Iskra-Module")
        let semaphore = DispatchSemaphore(value: 0)
        var running = false
        URLSession.shared.dataTask(with: request) { _, response, _ in
            running = (response as? HTTPURLResponse)?.statusCode == 200
            semaphore.signal()
        }.resume()
        _ = semaphore.wait(timeout: .now() + 1.2)
        return running
    }

    static func settingsURL() -> URL {
        URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")!
    }
}

private func runService() -> Never {
    do {
        try Companion.installResources()
        let logURL = Companion.appSupport.appendingPathComponent("transcription-service.log")
        FileManager.default.createFile(atPath: logURL.path, contents: nil)
        let log = try FileHandle(forWritingTo: logURL)
        try log.seekToEnd()
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = [Companion.module.appendingPathComponent("start.command").path]
        process.currentDirectoryURL = Companion.module
        process.environment = ProcessInfo.processInfo.environment.merging([
            "ISKRA_FFMPEG": Bundle.main.resourceURL!.appendingPathComponent(moduleName).appendingPathComponent("ffmpeg").path,
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

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var statusLabel: NSTextField!
    private var detailLabel: NSTextField!

    func applicationDidFinishLaunching(_ notification: Notification) {
        if installInApplicationsIfNeeded() { return }
        buildWindow()
        do {
            try Companion.register()
            refreshStatus()
        } catch { showError(error.localizedDescription) }
        if CommandLine.arguments.contains("--start") { handleStart() }
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        guard urls.contains(where: { $0.scheme == appURLScheme && $0.host == "start" }) else { return }
        handleStart()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool {
        if !hasVisibleWindows { window.makeKeyAndOrderFront(nil) }
        return true
    }

    private func installInApplicationsIfNeeded() -> Bool {
        let target = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Applications", isDirectory: true).appendingPathComponent(appName, isDirectory: true)
        let current = Bundle.main.bundleURL.standardizedFileURL
        if current == target.standardizedFileURL { return false }
        do {
            try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
            // Install to a sibling staging path first: Finder may be launching the
            // downloaded app from a temporary quarantine location, and replacing
            // the currently running target in place can leave a half-copied bundle.
            let staging = target.deletingLastPathComponent()
                .appendingPathComponent(".Iskra-transcription-install-\(UUID().uuidString).app", isDirectory: true)
            try FileManager.default.copyItem(at: current, to: staging)
            if FileManager.default.fileExists(atPath: target.path) {
                let backup = target.deletingLastPathComponent()
                    .appendingPathComponent(".Iskra-transcription-old-\(UUID().uuidString).app", isDirectory: true)
                try FileManager.default.moveItem(at: target, to: backup)
                do {
                    try FileManager.default.moveItem(at: staging, to: target)
                    try? FileManager.default.removeItem(at: backup)
                } catch {
                    try? FileManager.default.moveItem(at: backup, to: target)
                    throw error
                }
            } else {
                try FileManager.default.moveItem(at: staging, to: target)
            }
            let appURL = target as CFURL
            LSRegisterURL(appURL, true)
            let config = NSWorkspace.OpenConfiguration()
            config.createsNewApplicationInstance = true
            config.allowsRunningApplicationSubstitution = false
            NSWorkspace.shared.openApplication(at: target, configuration: config) { _, error in
                DispatchQueue.main.async {
                    if let error {
                        self.showError("Не удалось открыть установленную Искру: \(error.localizedDescription)")
                    } else {
                        NSApp.terminate(nil)
                    }
                }
            }
            return true
        } catch {
            showError("Не удалось установить приложение в ~/Applications: \(error.localizedDescription)")
            return false
        }
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

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
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
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                if !Companion.isRunning() { try Companion.start() }
                DispatchQueue.main.async {
                    self.statusLabel?.stringValue = "Служба готова"
                    self.detailLabel?.stringValue = "Вернитесь в Искру и повторите расшифровку."
                }
            } catch { DispatchQueue.main.async { self.showError(error.localizedDescription) } }
        }
    }

    private func refreshStatus() {
        DispatchQueue.global(qos: .utility).async {
            let running = Companion.isRunning()
            let service = Companion.service.status
            DispatchQueue.main.async {
                self.statusLabel.stringValue = running ? "Служба работает" : service == .requiresApproval ? "Нужно разрешить фоновую службу" : "Установка завершена"
                if service == .requiresApproval {
                    self.detailLabel.stringValue = "В настройках Mac разрешите фоновую службу Искры. Она не запускается при входе — только по запросу из Искры."
                }
            }
        }
    }

    private func showError(_ message: String) {
        statusLabel?.stringValue = "Не удалось запустить службу"
        detailLabel?.stringValue = message
        let alert = NSAlert(); alert.messageText = "Модуль расшифровки Искры"; alert.informativeText = message; alert.alertStyle = .warning
        alert.addButton(withTitle: "Понятно"); alert.runModal()
    }

    @objc private func startClicked() { handleStart() }
    @objc private func stopClicked() {
        do { try Companion.stop(); statusLabel.stringValue = "Служба остановлена" }
        catch { showError(error.localizedDescription) }
    }
    @objc private func settingsClicked() { NSWorkspace.shared.open(Companion.settingsURL()) }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
