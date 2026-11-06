import Capacitor
import Combine
import CryptoKit
import LocalAuthentication
import Security
import SwiftUI
import UIKit

// Блокировка приложения кодом из 4 цифр и Face ID / Touch ID — как в банковских
// приложениях. Это защита экрана, а не вход: аккаунт и сессия Supabase в WebView
// от неё не меняются. Код хранится только хешем SHA256 в связке ключей этого
// устройства (WhenUnlockedThisDeviceOnly) и никуда не уходит.
//
// Экран живёт в отдельном окне поверх WebView (AppLockWindow), поэтому закрывает
// и кабинет, и нативные бары. Включается из профиля (src/lib/appLock.ts через
// плагин IskraAppLock). «Забыл код» снимает блокировку и просит веб выйти из
// аккаунта (событие forgot); выход из аккаунта в вебе тоже снимает блокировку.
final class AppLock: ObservableObject {
    static let shared = AppLock()

    static let codeLength = 4
    /// Сколько можно побыть в другом приложении без повторного кода.
    private static let grace: TimeInterval = 10
    private static let enabledKey = "IskraAppLockEnabled"
    private static let biometricsKey = "IskraAppLockBiometrics"
    private static let keychainAccount = "app-lock-code"

    enum Screen: Equatable { case none, locked, setup, curtain }

    @Published private(set) var isEnabled: Bool
    @Published var useBiometrics: Bool {
        didSet { UserDefaults.standard.set(useBiometrics, forKey: Self.biometricsKey) }
    }
    @Published private(set) var screen: Screen = .none

    private var backgroundedAt: Date?
    /// Системное окно (ключ доступа, Face ID) делает приложение неактивным — шторку не ставим.
    private var systemPrompts = 0
    /// Face ID предлагаем сам один раз на каждую блокировку, дальше — по кнопке.
    private var autoBiometryDone = false
    private var setupDone: ((Bool) -> Void)?
    var onForgot: (() -> Void)?
    var onChange: (() -> Void)?

    private init() {
        #if DEBUG
        // `-IskraAppLockCode 1234` — включить блокировку с этим кодом (проверка на симуляторе).
        if let code = UserDefaults.standard.string(forKey: "IskraAppLockCode"), code.count == Self.codeLength, code.allSatisfy(\.isNumber) {
            Self.writeHash(Self.hash(code))
            UserDefaults.standard.set(true, forKey: Self.enabledKey)
        }
        #endif
        let on = UserDefaults.standard.bool(forKey: Self.enabledKey) && Self.readHash() != nil
        isEnabled = on
        useBiometrics = UserDefaults.standard.object(forKey: Self.biometricsKey) as? Bool ?? true
        screen = on ? .locked : .none
        let center = NotificationCenter.default
        center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.resignActive() }
        center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.becameActive() }
        center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.enteredBackground() }
        center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in self?.enteringForeground() }
    }

    // MARK: Что умеет устройство

    /// Face ID, Touch ID или nil (тогда только код). Лицо не настроено — считаем, что нет: иначе проверка повиснет.
    var biometryName: String? {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else { return nil }
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        default: return nil
        }
    }

    // MARK: Включение

    /// Лист «Придумайте код» поверх приложения; done(true) — код задан.
    func beginSetup(_ done: @escaping (Bool) -> Void) {
        setupDone?(false)
        setupDone = done
        screen = .setup
    }

    func finishSetup(code: String?) {
        let done = setupDone
        setupDone = nil
        if let code, Self.writeHash(Self.hash(code)) {
            UserDefaults.standard.set(true, forKey: Self.enabledKey)
            isEnabled = true
            done?(true)
        } else {
            done?(false)
        }
        screen = .none
        onChange?()
    }

    func disable() {
        Self.deleteHash()
        UserDefaults.standard.set(false, forKey: Self.enabledKey)
        isEnabled = false
        if screen == .locked || screen == .curtain { screen = .none }
        onChange?()
    }

    // MARK: Блокировка

    func systemPromptBegan() { DispatchQueue.main.async { self.systemPrompts += 1 } }
    func systemPromptEnded() { DispatchQueue.main.async { self.systemPrompts = max(0, self.systemPrompts - 1) } }

    private func resignActive() {
        // Шторка в переключателе приложений: содержимое не видно, пока окно не в фокусе.
        guard isEnabled, screen == .none, systemPrompts == 0 else { return }
        screen = .curtain
    }

    private func becameActive() {
        if screen == .curtain { screen = .none }
        if screen == .locked { autoUnlock() }
    }

    private func enteredBackground() {
        guard isEnabled else { return }
        backgroundedAt = Date()
        if screen == .none { screen = .curtain }
    }

    private func enteringForeground() {
        guard isEnabled, let at = backgroundedAt else { return }
        backgroundedAt = nil
        if Date().timeIntervalSince(at) > Self.grace, screen != .setup {
            autoBiometryDone = false
            screen = .locked
        }
    }

    func check(_ code: String) -> Bool {
        guard let stored = Self.readHash(), stored == Self.hash(code) else { return false }
        unlock()
        return true
    }

    private func unlock() {
        screen = .none
        autoBiometryDone = false
    }

    /// Первый показ экрана блокировки — сразу Face ID, если приложение уже активно.
    func autoUnlock() {
        guard !autoBiometryDone, UIApplication.shared.applicationState == .active else { return }
        autoBiometryDone = true
        unlockWithBiometrics()
    }

    /// Face ID / Touch ID; при отмене остаётся экран с цифрами.
    func unlockWithBiometrics() {
        guard screen == .locked, useBiometrics, biometryName != nil else { return }
        let context = LAContext()
        context.localizedFallbackTitle = "Ввести код"
        systemPrompts += 1
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Открыть Искру") { ok, _ in
            DispatchQueue.main.async {
                self.systemPrompts = max(0, self.systemPrompts - 1)
                if ok { self.unlock() }
            }
        }
    }

    /// «Забыл код»: снять блокировку и выйти из аккаунта — дальше обычный вход.
    func forgot() {
        disable()
        onForgot?()
    }

    // MARK: Хранение

    private static func hash(_ code: String) -> Data {
        // Соль — название приложения: хеш не совпадёт с тем же кодом в другом приложении.
        Data(SHA256.hash(data: Data("iskra-app-lock:\(code)".utf8)))
    }

    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: Bundle.main.bundleIdentifier ?? "iskra",
         kSecAttrAccount as String: keychainAccount]
    }

    private static func readHash() -> Data? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        return SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess ? out as? Data : nil
    }

    @discardableResult
    private static func writeHash(_ data: Data) -> Bool {
        deleteHash()
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        return SecItemAdd(q as CFDictionary, nil) == errSecSuccess
    }

    private static func deleteHash() {
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Окно поверх приложения

/// Отдельное окно над WebView. Пока экрана нет, оно скрыто и не ловит касания.
final class AppLockWindow: UIWindow {
    private static var current: AppLockWindow?
    private var observer: Any?

    static func install(in scene: UIWindowScene) {
        let window = AppLockWindow(windowScene: scene)
        window.windowLevel = .alert + 1
        window.backgroundColor = .clear
        let host = UIHostingController(rootView: AppLockRoot(lock: .shared))
        host.view.backgroundColor = .clear
        window.rootViewController = host
        window.sync(AppLock.shared.screen)
        window.observer = AppLock.shared.$screen.receive(on: RunLoop.main).sink { [weak window] in window?.sync($0) }
        current = window
    }

    private func sync(_ screen: AppLock.Screen) {
        if screen == .none {
            // Даём экрану растаять, потом прячем окно.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                if AppLock.shared.screen == .none { self?.isHidden = true }
            }
        } else {
            isHidden = false
        }
    }
}

private extension UIColor {
    static let iskraPurple = UIColor(red: 0x78 / 255, green: 0x6A / 255, blue: 0xD7 / 255, alpha: 1)
}

private struct AppLockRoot: View {
    @ObservedObject var lock: AppLock

    var body: some View {
        ZStack {
            switch lock.screen {
            case .none: Color.clear
            case .curtain: Curtain()
            case .locked: LockScreen(lock: lock)
            case .setup: SetupScreen(lock: lock)
            }
        }
        .animation(.easeOut(duration: 0.25), value: lock.screen)
    }
}

private struct Curtain: View {
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            Image(systemName: "lock.fill").font(.system(size: 34, weight: .medium)).foregroundColor(Color(.iskraPurple))
        }
        .transition(.opacity)
    }
}

private struct LockScreen: View {
    @ObservedObject var lock: AppLock
    @State private var code = ""
    @State private var wrong = 0
    @State private var askForgot = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 16)
            Image(systemName: "lock.fill").font(.system(size: 30, weight: .medium)).foregroundColor(Color(.iskraPurple))
            Text("Введите код Искры")
                .font(.title3.weight(.semibold))
                .padding(.top, 12)
            CodePad(code: $code, wrong: wrong, biometry: lock.useBiometrics ? lock.biometryName : nil, onBiometry: lock.unlockWithBiometrics) { value in
                if !lock.check(value) {
                    wrong += 1
                    code = ""
                }
            }
            .padding(.top, 28)
            Button("Забыли код? Выйти из аккаунта") { askForgot = true }
                .font(.footnote)
                .foregroundColor(.secondary)
                .frame(minHeight: 44)
                .padding(.top, 16)
            Spacer(minLength: 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground).ignoresSafeArea())
        .transition(.opacity)
        .onAppear { lock.autoUnlock() }
        .accessibilityAddTraits(.isModal)
        .alert("Выйти из аккаунта?", isPresented: $askForgot) {
            Button("Отмена", role: .cancel) {}
            Button("Выйти", role: .destructive) { lock.forgot() }
        } message: {
            Text("Блокировка выключится. Курсы и прогресс останутся в аккаунте — войдите снова по почте, Google, Apple или ключу доступа.")
        }
    }
}

/// «Придумайте код» → «Повторите код». Включается сразу по второму вводу.
private struct SetupScreen: View {
    @ObservedObject var lock: AppLock
    @State private var first: String?
    @State private var code = ""
    @State private var wrong = 0

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button("Отмена") { lock.finishSetup(code: nil) }
                    .frame(minWidth: 44, minHeight: 44)
                    .padding(.horizontal, 16)
            }
            Spacer(minLength: 8)
            Text(first == nil ? "Придумайте код" : "Повторите код")
                .font(.title3.weight(.semibold))
            Text(wrong > 0 && first == nil ? "Коды не совпали. Попробуйте ещё раз." : "4 цифры. Их спросим при каждом открытии Искры.")
                .font(.footnote)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.top, 6)
                .padding(.horizontal, 24)
            CodePad(code: $code, wrong: wrong) { value in
                if let first {
                    if value == first { lock.finishSetup(code: value) }
                    else { wrong += 1; self.first = nil; code = "" }
                } else {
                    first = value
                    code = ""
                }
            }
            .padding(.top, 28)
            Spacer(minLength: 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground).ignoresSafeArea())
        .transition(.move(edge: .bottom))
    }
}

/// Точки кода и цифры: круглые кнопки одного размера, иконки по центру кнопки.
private struct CodePad: View {
    @Binding var code: String
    var wrong: Int = 0
    /// «Face ID» / «Touch ID» — кнопка слева от нуля; nil — пустое место.
    var biometry: String?
    var onBiometry: () -> Void = {}
    var onComplete: (String) -> Void

    @State private var shake: CGFloat = 0
    private let keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
    @ScaledMetric(relativeTo: .title) private var size: CGFloat = 72

    var body: some View {
        // На низких экранах (SE, альбом) кнопки ужимаются, а не обрезаются.
        let key = min(size, max(52, (UIScreen.main.bounds.height - 360) / 4.6))
        VStack(spacing: 26) {
            HStack(spacing: 16) {
                ForEach(0..<AppLock.codeLength, id: \.self) { i in
                    Circle()
                        .fill(i < code.count ? Color(.iskraPurple) : Color.clear)
                        .overlay(Circle().strokeBorder(i < code.count ? Color(.iskraPurple) : Color.secondary, lineWidth: 1.5))
                        .frame(width: 13, height: 13)
                }
            }
            .offset(x: shake)
            .accessibilityElement()
            .accessibilityLabel("Введено цифр: \(code.count) из \(AppLock.codeLength)")
            .onChange(of: wrong) { _ in
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                let steps: [CGFloat] = [-10, 10, -6, 6, 0]
                for (i, x) in steps.enumerated() {
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.06) { withAnimation(.linear(duration: 0.06)) { shake = x } }
                }
            }

            VStack(spacing: 14) {
                ForEach(0..<3, id: \.self) { row in
                    HStack(spacing: 22) {
                        ForEach(keys[(row * 3)..<(row * 3 + 3)], id: \.self) { digit($0, key) }
                    }
                }
                HStack(spacing: 22) {
                    if let biometry {
                        iconKey(biometry == "Touch ID" ? "touchid" : "faceid", label: biometry, size: key, action: onBiometry)
                    } else {
                        Color.clear.frame(width: key, height: key)
                    }
                    digit("0", key)
                    iconKey("delete.left", label: "Стереть", size: key) {
                        if !code.isEmpty { code.removeLast() }
                    }
                    .opacity(code.isEmpty ? 0.35 : 1)
                }
            }
        }
    }

    private func digit(_ d: String, _ size: CGFloat) -> some View {
        Button {
            guard code.count < AppLock.codeLength else { return }
            UISelectionFeedbackGenerator().selectionChanged()
            code.append(d)
            if code.count == AppLock.codeLength {
                let value = code
                // Последняя точка успевает загореться, прежде чем проверим.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { onComplete(value) }
            }
        } label: {
            Text(d)
                .font(.system(size: size * 0.42).monospacedDigit())
                .foregroundColor(.primary)
                .frame(width: size, height: size)
                .background(Circle().fill(Color(.secondarySystemBackground)))
                .contentShape(Circle())
        }
        .buttonStyle(PadPress())
    }

    private func iconKey(_ symbol: String, label: String, size: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size * 0.33))
                .foregroundColor(.primary)
                .frame(width: size, height: size)
                .contentShape(Circle())
        }
        .buttonStyle(PadPress())
        .accessibilityLabel(label)
    }
}

private struct PadPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1)
            .opacity(configuration.isPressed ? 0.7 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.8), value: configuration.isPressed)
    }
}

// MARK: - Мост для профиля

/// Строка «Блокировка приложения» в «Способах входа» (src/lib/appLock.ts).
@objc(AppLockPlugin)
public class AppLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppLockPlugin"
    public let jsName = "IskraAppLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBiometrics", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        let lock = AppLock.shared
        // retainUntilConsumed: «Забыл код» на холодном старте — веб ещё не подписался.
        lock.onForgot = { [weak self] in self?.notifyListeners("forgot", data: [:], retainUntilConsumed: true) }
        lock.onChange = { [weak self] in self?.notifyListeners("change", data: self?.state() ?? [:]) }
    }

    private func state() -> [String: Any] {
        let lock = AppLock.shared
        return ["enabled": lock.isEnabled, "biometry": lock.biometryName ?? NSNull(), "useBiometrics": lock.useBiometrics]
    }

    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.state()) }
    }

    @objc func setup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            AppLock.shared.beginSetup { _ in call.resolve(self.state()) }
        }
    }

    @objc func disable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            AppLock.shared.disable()
            call.resolve(self.state())
        }
    }

    @objc func setBiometrics(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            AppLock.shared.useBiometrics = call.getBool("on") ?? true
            call.resolve(self.state())
        }
    }
}
