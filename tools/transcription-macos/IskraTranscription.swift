import AppKit
import CoreServices
import Foundation
import Security
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
        // The site compares it with the latest release and says so plainly.
        setenv("ISKRA_APP_VERSION", Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "", 1)
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

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var statusLabel: NSTextField!
    private var detailLabel: NSTextField!
    private var startButton: NSButton!
    private var stopButton: NSButton!
    private var settingsButton: NSButton!
    private var revealButton: NSButton!
    private var versionLabel: NSTextField!
    private var updateTask: Task<Void, Never>?
    private var updateTimer: Timer?

    private var startTask: Task<Void, Never>?
    private var pendingApproval = false
    private var requestedStart = false
    private var installing = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildWindow()
        requestedStart = requestedStart || CommandLine.arguments.contains("--start")
        buildMenu()
        if installInApplicationsIfNeeded() { return }
        Companion.trashOtherCopies()
        handleStart()
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
                versionLabel.stringValue = "Версия \(Updater.currentVersion) · устанавливаем обновление \(manifest.version)…"
                try await Updater.install(manifest)
                await startTask?.value
                versionLabel.stringValue = "Обновлено до \(manifest.version) · перезапуск…"
                Updater.relaunch(arguments: window.isVisible ? [] : ["--start"])
                NSApp.terminate(nil)
            } catch {
                versionLabel.stringValue = versionText()
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
        statusLabel.stringValue = "Устанавливаем приложение…"
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
            showError("Не удалось установить приложение в папку «Программы». \(error.localizedDescription)")
        }
        return true
    }

    private func buildWindow() {
        let frame = NSRect(x: 0, y: 0, width: 460, height: 300)
        window = NSWindow(contentRect: frame, styleMask: [.titled, .closable], backing: .buffered, defer: false)
        // Keep the ARC-owned window alive when the red close button hides it.
        // Dock reopen and asynchronous status updates reuse this same window.
        window.isReleasedWhenClosed = false
        window.title = "Искра · Расшифровка"
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

        startButton = button("Запустить обработчик", action: #selector(startClicked))
        startButton.frame = NSRect(x: 28, y: 92, width: 196, height: 38)
        content.addSubview(startButton)
        stopButton = button("Остановить", action: #selector(stopClicked))
        stopButton.frame = NSRect(x: 232, y: 92, width: 110, height: 38)
        content.addSubview(stopButton)
        settingsButton = button("Настройки фоновой службы", action: #selector(settingsClicked))
        settingsButton.frame = NSRect(x: 28, y: 42, width: 240, height: 32)
        content.addSubview(settingsButton)

        revealButton = button("Показать приложение в Finder", action: #selector(revealInstalledApp))
        revealButton.frame = NSRect(x: 28, y: 92, width: 260, height: 38)
        revealButton.isHidden = true
        content.addSubview(revealButton)

        versionLabel = label(versionText(), size: 10, weight: .regular)
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
        guard startTask == nil, !installing, revealButton.isHidden else { return }
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

    private func showInstallRecovery() {
        guard FileManager.default.fileExists(atPath: Companion.installedURL.path) else {
            showError("Установленная копия не найдена. Закройте это окно и снова откройте приложение из ZIP.")
            return
        }
        startButton.isHidden = true
        stopButton.isHidden = true
        settingsButton.isHidden = true
        revealButton.isHidden = false
        statusLabel.stringValue = "Откройте установленное приложение"
        detailLabel.stringValue = "Покажите приложение в Finder и откройте выделенный файл. Затем вернитесь в Искру."
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func revealInstalledApp() {
        NSWorkspace.shared.activateFileViewerSelecting([Companion.installedURL])
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
